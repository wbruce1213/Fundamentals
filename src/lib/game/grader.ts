import { handToKey } from "./deck";
import { RFI_RANGES } from "@/data/preflop/rfi";
import { VS_RFI_RANGES } from "@/data/preflop/vs_rfi";
import type { ActionType, Card, HandState, JudgeResult, JudgeVerdict, Position } from "./types";
import { getHero, getVisibleBoard } from "./state-machine";

// ─── Preflop grading ──────────────────────────────────────────────────────────

function gradePreflop(
  holeCards: Card[],
  action: ActionType,
  position: Position,
  state: HandState
): JudgeResult {
  const key = handToKey(holeCards);
  const raisesBeforeHero = state.streetActions.filter(
    (a) => a.action.type === "raise" || a.action.type === "bet"
  ).length;

  let range: Record<string, { raise: number; call: number; fold: number }> | undefined;
  let context = "";

  if (raisesBeforeHero === 0) {
    // RFI opportunity
    range = RFI_RANGES[position];
    context = `RFI from ${position}`;
  } else if (raisesBeforeHero === 1 && position === "BB") {
    // Defending BB vs open
    const opener = state.streetActions.find(
      (a) => a.action.type === "raise"
    );
    const openerPlayer = state.players.find((p) => p.id === opener?.playerId);
    if (openerPlayer) {
      range = VS_RFI_RANGES["BB"]?.[openerPlayer.position];
      context = `BB defense vs ${openerPlayer.position} open`;
    }
  }

  if (!range) {
    // No chart for this exact scenario — fall back to postflop judge
    return {
      verdict: "acceptable",
      rating: 50,
      primaryReason: `No preflop chart for this exact scenario (${context || "complex multi-way"}). Postflop play judged separately.`,
      secondaryConsiderations: [],
      conceptTags: ["preflop-ranges", "chart-gap"],
    };
  }

  const frequencies = range[key];
  if (!frequencies) {
    // Hand not in any range = fold is correct
    const verdict: JudgeVerdict =
      action === "fold" ? "optimal" : action === "call" ? "blunder" : "mistake";
    return {
      verdict,
      rating: action === "fold" ? 90 : action === "call" ? 20 : 35,
      betterAction: action !== "fold" ? "fold" : undefined,
      primaryReason:
        action === "fold"
          ? `${key} is not in the ${context} range — folding is correct.`
          : `${key} is not in the ${context} range. This hand is a clear fold.`,
      secondaryConsiderations: [
        "Playing hands outside your range leaks value over a large sample.",
        "Tighten preflop to simplify postflop decisions.",
      ],
      conceptTags: ["preflop-ranges", "range-construction", context.toLowerCase().replace(" ", "-")],
    };
  }

  const chosenFreq =
    action === "fold"
      ? frequencies.fold
      : action === "call"
      ? frequencies.call
      : frequencies.raise;

  let verdict: JudgeVerdict;
  let rating: number;

  if (chosenFreq >= 0.75) {
    verdict = "optimal";
    rating = 85 + Math.round(chosenFreq * 15);
  } else if (chosenFreq >= 0.4) {
    verdict = "acceptable";
    rating = 60 + Math.round(chosenFreq * 40);
  } else if (chosenFreq > 0) {
    verdict = "mistake";
    rating = 25 + Math.round(chosenFreq * 50);
  } else {
    verdict = "blunder";
    rating = 10;
  }

  // Find the best action
  const best = Object.entries(frequencies).sort(([, a], [, b]) => b - a)[0];
  const betterAction = best[0] !== action ? best[0] : undefined;

  const reasonMap: Record<JudgeVerdict, string> = {
    optimal: `${key} is a ${chosenFreq >= 0.95 ? "clear" : "preferred"} ${action} from ${position}. ${chosenFreq >= 0.95 ? "No mix needed." : `Mix occasionally (${Math.round((1 - chosenFreq) * 100)}% other actions).`}`,
    acceptable: `${key} ${action} from ${position} is in the playbook but not the primary line (${Math.round(chosenFreq * 100)}% frequency). ${best[0] !== action ? `Prefer ${best[0]} at ${Math.round((best[1] as number) * 100)}%.` : ""}`,
    mistake: `${key} ${action} from ${position} is in the range but at a low frequency (${Math.round(chosenFreq * 100)}%). The stronger play is ${best[0]}.`,
    blunder: `${key} ${action} from ${position} is never correct here. ${best[0] !== "fold" ? `${key} is a ${best[0]} (${Math.round((best[1] as number) * 100)}%).` : `${key} is a fold from ${position}.`}`,
  };

  const secondary: string[] = [];
  if (position === "BTN" && action === "fold" && frequencies.raise > 0.5) {
    secondary.push("Button is the widest steal position — don't under-open here.");
  }
  if (action === "call" && frequencies.raise > frequencies.call) {
    secondary.push("3-betting is generally more profitable than calling here — it builds the pot when you have an edge and protects your hand.");
  }
  if (action === "raise" && frequencies.call > frequencies.raise) {
    secondary.push("Flatting keeps weaker hands in and masks your strength on this board texture.");
  }

  return {
    verdict,
    rating,
    betterAction,
    primaryReason: reasonMap[verdict],
    secondaryConsiderations: secondary,
    conceptTags: [
      "preflop-ranges",
      context.toLowerCase().replace(/ /g, "-"),
      verdict === "blunder" || verdict === "mistake" ? "range-construction" : "mixed-strategies",
    ],
  };
}

// ─── Main grader entry point ───────────────────────────────────────────────────

export function gradeDecision(
  holeCards: Card[],
  action: ActionType,
  amount: number,
  state: HandState
): JudgeResult | null {
  const hero = getHero(state);
  const board = getVisibleBoard(state);

  if (state.phase === "preflop") {
    return gradePreflop(holeCards, action, hero.position, state);
  }

  // Postflop grading is handled by the LLM judge — return null to signal that
  return null;
}
