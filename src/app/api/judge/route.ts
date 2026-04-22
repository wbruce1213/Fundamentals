import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { JudgeResult } from "@/lib/game/types";

const RequestSchema = z.object({
  handState: z.record(z.string(), z.unknown()),
  heroCards: z.array(z.object({ rank: z.string(), suit: z.string() })),
  action: z.string(),
  amount: z.number(),
  street: z.string(),
  position: z.string(),
  potSize: z.number(),
  heroStack: z.number(),
  boardCards: z.array(z.object({ rank: z.string(), suit: z.string() })),
});

const MOCK_RESULTS: Record<string, JudgeResult> = {
  fold: {
    verdict: "acceptable",
    rating: 58,
    betterAction: "bet",
    primaryReason:
      "Folding here gives up too much equity. With top pair and a gutshot you have enough equity to continue profitably even against a polarized betting range.",
    secondaryConsiderations: [
      "Consider the SPR — at 4:1, stacking off with top pair is usually correct.",
      "Your range advantage on this board texture means you should be betting, not folding to lead.",
    ],
    conceptTags: ["range-advantage", "pot-odds", "equity-realization"],
  },
  check: {
    verdict: "optimal",
    rating: 88,
    primaryReason:
      "Checking the flop in position with a strong range advantage is often the best play. You can realize equity cheaply and let the board develop.",
    secondaryConsiderations: [
      "Your checking range on this board can include monsters (trapping) which protects your checks.",
    ],
    conceptTags: ["range-advantage", "board-texture", "positional-play"],
  },
  call: {
    verdict: "mistake",
    rating: 32,
    betterAction: "raise",
    primaryReason:
      "Calling is the worst of the three options here. You have a nutted hand and need to build the pot. Raising protects your equity and denies free cards.",
    secondaryConsiderations: [
      "With 2 pair on a wet board you must raise to charge draws.",
      "Slow-playing is almost never correct when the board is draw-heavy.",
    ],
    conceptTags: ["nut-advantage", "board-texture", "value-betting"],
  },
  bet: {
    verdict: "optimal",
    rating: 92,
    primaryReason:
      "A 1/3-pot bet on this paired board is the highest-EV play. You have a massive range advantage and can bet three streets for value with your top of range.",
    secondaryConsiderations: [
      "Small sizing leverages your range advantage without over-committing bluffs.",
    ],
    conceptTags: ["range-advantage", "bet-sizing", "board-texture"],
  },
  raise: {
    verdict: "acceptable",
    rating: 68,
    primaryReason:
      "Raising is reasonable but sizing matters. Going to 2.5x gives villain good pot odds to continue with draws. A 3x sizing is more effective.",
    secondaryConsiderations: [
      "Consider what hands you want to put in your raising range and make sure they are balanced with bluffs.",
    ],
    conceptTags: ["bet-sizing", "range-construction", "polarization"],
  },
};

const JUDGE_SYSTEM_PROMPT = `You are an expert poker coach specializing in 6-max No-Limit Hold'em cash games at 100 big blinds. You evaluate decisions based on fundamental poker concepts — ranges, equity, pot odds, range/nut advantage, board texture, and stack-to-pot ratio (SPR). You do NOT invent solver frequencies or cite exact GTO numbers. You teach patterns and principles.

EVALUATION CRITERIA:
- "optimal": The chosen action maximizes EV given the player's range and situation. Frequency ≥ 75%.
- "acceptable": Reasonable play, some merit, but not the highest-EV line. Frequency 30-74%.
- "mistake": Technically in range but incorrect for this specific spot. Frequency 10-29%.
- "blunder": Clear error — never correct or frequency <10%. Gives up significant EV.

FUNDAMENTAL CONCEPTS to reference:
1. Range construction: what hands belong in this action's range?
2. Equity: raw hand strength vs. opponent's continuing range
3. Pot odds: is the price correct to call?
4. Range advantage: who has more strong hands on this board?
5. Nut advantage: who has more nutted hands specifically?
6. Board texture: is this a static or dynamic board? Connected or dry?
7. SPR: low SPR favors one-pair hands; high SPR favors drawing hands
8. Position: in-position players have more streets of information
9. Bet sizing: does the sizing make sense for the intended goal?
10. Polarization: is the range polarized (strong + bluffs) or merged (medium)?

FEW-SHOT EXAMPLES:

Example 1:
Hand: Hero has Ah Jh on BTN. Board: Kh 7h 2c. Action: Check facing a 1/3-pot bet from BB.
Evaluation: { verdict: "mistake", rating: 38, betterAction: "raise", primaryReason: "AhJh has 15 outs (9 hearts + nut-flush draw, backdoor straight). Raising to build a pot when you have equity AND fold equity is clearly superior to calling.", secondaryConsiderations: ["The nut-flush draw has significant equity vs. any made hand BB can have here.", "Raising disguises your draw and charges naked pairs."], conceptTags: ["draws", "semi-bluff", "nut-advantage"] }

Example 2:
Hand: Hero has 5c 5d in CO. Board: Kd Qh 9s. Action: Continuation bet 2/3 pot.
Evaluation: { verdict: "blunder", rating: 12, betterAction: "check", primaryReason: "55 missed this board completely. The CO's range hits K and Q heavily but 55 has no equity. C-betting into a BB that connects well just builds a pot you will have to give up.", secondaryConsiderations: ["On K-Q-9 your range advantage evaporates unless you are BTN. CO should check-fold most of their low pairs.", "SPR > 5 means you need real equity to barrel."], conceptTags: ["range-advantage", "board-texture", "positional-play"] }

Example 3:
Hand: Hero has Kc Ks in BB. Facing a 3x BTN open + CO call. Action: 3-bet to 11bb.
Evaluation: { verdict: "optimal", rating: 97, primaryReason: "KK is a mandatory 3-bet from BB. Squeezing isolates the BTN open and punishes the CO flat-caller.", secondaryConsiderations: ["Sizing to 11bb (roughly 3x the open) is correct when there is a cold-caller.", "Never flat KK pre in a situation where you can charge two players."], conceptTags: ["3-bet-squeeze", "preflop-ranges", "value-betting"] }

Example 4:
Hand: Hero has 7d 6d on BB. Board: 8h 5c 2d. Action: Check-raise all-in facing BTN's 1/2-pot bet.
Evaluation: { verdict: "acceptable", rating: 62, betterAction: "check-raise smaller", primaryReason: "76d has an open-ended straight draw (9 outs) on a board you likely have range advantage on. Check-raising is correct but going all-in at ~5x SPR with just a draw loses value if called.", secondaryConsiderations: ["A smaller check-raise to 2.5x allows for a profitable bluff while leaving stack behind for future streets.", "All-in is optimal if villain's range is capped — it's a judgment call."], conceptTags: ["draws", "spr", "semi-bluff"] }

Example 5:
Hand: Hero has As Kd on BTN. Board: Jh Ts 4c. Action: Bet 3/4 pot.
Evaluation: { verdict: "mistake", rating: 41, betterAction: "bet 1/3 pot", primaryReason: "AK has only a backdoor draw and two overcards on J-T-4. You have range advantage here but 3/4 pot with air commits too many chips without equity.", secondaryConsiderations: ["A 1/3-pot bet achieves the same fold equity at a fraction of the risk.", "Reserve large sizes for hands that can barrel multiple streets."], conceptTags: ["bet-sizing", "board-texture", "equity-realization"] }

Respond ONLY with valid JSON in the specified tool format. No prose.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = RequestSchema.parse(body);

    if (process.env.MOCK_LLM === "true") {
      const mock = MOCK_RESULTS[data.action] ?? MOCK_RESULTS.check;
      return NextResponse.json(mock);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const boardStr =
      data.boardCards.map((c) => `${c.rank}${c.suit}`).join(" ") || "none";
    const heroStr = data.heroCards.map((c) => `${c.rank}${c.suit}`).join(" ");

    const userMessage = `Evaluate this poker decision:

Position: ${data.position}
Street: ${data.street}
Hero cards: ${heroStr}
Board: ${boardStr}
Pot: ${data.potSize} chips
Hero stack: ${data.heroStack} chips
Hero action: ${data.action}${data.amount > 0 ? ` to ${data.amount}` : ""}

Recent action: ${JSON.stringify(
      (data.handState as { streetActions?: unknown[] }).streetActions?.slice(-4) ?? []
    )}

Evaluate the hero's decision on fundamentals. Return your evaluation as the judge_verdict tool call.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: JUDGE_SYSTEM_PROMPT,
      tools: [
        {
          name: "judge_verdict",
          description: "Return a structured poker decision verdict",
          input_schema: {
            type: "object" as const,
            properties: {
              verdict: {
                type: "string",
                enum: ["optimal", "acceptable", "mistake", "blunder"],
              },
              rating: { type: "number", minimum: 0, maximum: 100 },
              better_action: { type: "string" },
              primary_reason: { type: "string" },
              secondary_considerations: {
                type: "array",
                items: { type: "string" },
              },
              concept_tags: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["verdict", "rating", "primary_reason", "secondary_considerations", "concept_tags"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "judge_verdict" },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "No tool use in response" }, { status: 500 });
    }

    const input = toolUse.input as {
      verdict: string;
      rating: number;
      better_action?: string;
      primary_reason: string;
      secondary_considerations: string[];
      concept_tags: string[];
    };

    const result: JudgeResult = {
      verdict: input.verdict as JudgeResult["verdict"],
      rating: input.rating,
      betterAction: input.better_action,
      primaryReason: input.primary_reason,
      secondaryConsiderations: input.secondary_considerations,
      conceptTags: input.concept_tags,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/judge]", err);
    return NextResponse.json(
      { error: "Judge failed", detail: String(err) },
      { status: 500 }
    );
  }
}
