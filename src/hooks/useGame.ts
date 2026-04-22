"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyAction, createNewHand, getActivePlayer, getHero } from "@/lib/game/state-machine";
import { botDecide, buildBotInput } from "@/lib/game/bots";
import { gradeDecision } from "@/lib/game/grader";
import { cardsToString, cardToString } from "@/lib/game/deck";
import type { ActionType, HandState, JudgeResult } from "@/lib/game/types";

const BOT_THINK_MS = 600;

type GameState = {
  hand: HandState | null;
  verdict: JudgeResult | null;
  isThinking: boolean; // bot thinking
  isGrading: boolean; // awaiting judge
  userId: string | null;
  sessionId: string | null;
};

async function ensureIdentity(): Promise<{ userId: string; sessionId: string }> {
  const stored = localStorage.getItem("fundamentals_identity");
  if (stored) {
    return JSON.parse(stored);
  }
  const res = await fetch("/api/identity", { method: "POST" });
  const data = await res.json();
  localStorage.setItem("fundamentals_identity", JSON.stringify(data));
  return data;
}

async function fetchJudge(
  hand: HandState,
  heroCards: ReturnType<typeof getHero>["holeCards"],
  action: ActionType,
  amount: number
): Promise<JudgeResult> {
  const hero = getHero(hand);
  const board = hand.board.slice(
    0,
    hand.phase === "preflop" ? 0
      : hand.phase === "flop" ? 3
      : hand.phase === "turn" ? 4
      : 5
  );

  const res = await fetch("/api/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handState: hand,
      heroCards: heroCards ?? [],
      action,
      amount,
      street: hand.phase,
      position: hero.position,
      potSize: hand.pot,
      heroStack: hero.stack,
      boardCards: board,
    }),
  });

  if (!res.ok) throw new Error("Judge failed");
  return res.json();
}

async function persistHand(params: {
  userId: string;
  sessionId: string;
  hand: HandState;
  action: ActionType;
  amount: number;
  verdict: JudgeResult | null;
}) {
  const { userId, sessionId, hand, action, amount, verdict } = params;
  const hero = getHero(hand);
  const board = hand.board.slice(0, hand.phase === "preflop" ? 0 : hand.phase === "flop" ? 3 : hand.phase === "turn" ? 4 : 5);

  await fetch("/api/hand", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      sessionId,
      position: hero.position,
      heroCards: hero.holeCards ? cardsToString(hero.holeCards) : "",
      boardCards: cardsToString(board),
      street: hand.phase,
      potSize: hand.pot,
      heroStack: hero.stack,
      villainStack: hand.players.filter((p) => !p.isHero)[0]?.stack ?? 10000,
      action,
      sizingBB: amount > 0 ? amount / hand.bigBlindSize : undefined,
      verdict: verdict?.verdict,
      rating: verdict?.rating,
      betterAction: verdict?.betterAction,
      primaryReason: verdict?.primaryReason,
      secondaryConsiderations: verdict?.secondaryConsiderations ?? [],
      conceptTags: verdict?.conceptTags ?? [],
      opponents: JSON.stringify(
        hand.players
          .filter((p) => !p.isHero)
          .map((p) => ({ position: p.position, archetype: p.archetype }))
      ),
    }),
  });
}

export function useGame() {
  const [state, setState] = useState<GameState>({
    hand: null,
    verdict: null,
    isThinking: false,
    isGrading: false,
    userId: null,
    sessionId: null,
  });

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBotThinkingRef = useRef(false);

  // Initialize identity on mount
  useEffect(() => {
    ensureIdentity()
      .then(({ userId, sessionId }) => {
        setState((s) => ({ ...s, userId, sessionId }));
      })
      .catch(console.error);
  }, []);

  const dealNewHand = useCallback(() => {
    isBotThinkingRef.current = false;
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    const hand = createNewHand();
    setState((s) => ({
      ...s,
      hand,
      verdict: null,
      isThinking: false,
      isGrading: false,
    }));
  }, []);

  // Auto-advance bots when it's not hero's turn.
  // Uses a ref to gate re-entry — NOT state.isThinking — so setting isThinking:true
  // doesn't re-run this effect and cancel its own timer.
  useEffect(() => {
    const hand = state.hand;
    if (!hand || state.isGrading) return;
    if (hand.awaitingHeroAction) return;
    if (hand.phase === "complete" || hand.phase === "showdown") return;

    const active = getActivePlayer(hand);
    if (!active || active.isFolded || active.isAllIn || active.isHero) return;
    if (isBotThinkingRef.current) return;

    isBotThinkingRef.current = true;
    setState((s) => ({ ...s, isThinking: true }));

    botTimerRef.current = setTimeout(() => {
      isBotThinkingRef.current = false;
      setState((s) => {
        if (!s.hand) return { ...s, isThinking: false };
        const currentActive = getActivePlayer(s.hand);
        if (!currentActive || currentActive.isHero) return { ...s, isThinking: false };

        const input = buildBotInput(s.hand, currentActive);
        const botAction = botDecide(
          currentActive.archetype as "Reg" | "Fish" | "LAG",
          input
        );
        const newHand = applyAction(s.hand, botAction);
        return { ...s, hand: newHand, isThinking: false };
      });
    }, BOT_THINK_MS);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      isBotThinkingRef.current = false;
    };
  }, [state.hand, state.isGrading]);

  const heroAct = useCallback(
    async (type: ActionType, amount: number) => {
      const { hand, userId, sessionId } = state;
      if (!hand || !hand.awaitingHeroAction) return;

      const hero = getHero(hand);
      const heroCards = hero.holeCards;

      // Apply action immediately for responsive UI
      const newHand = applyAction(hand, { type, amount });
      setState((s) => ({ ...s, hand: newHand, verdict: null, isGrading: true }));

      try {
        // Grade preflop immediately via chart, postflop via LLM
        const localVerdict = gradeDecision(heroCards ?? [], type, amount, hand);

        let finalVerdict: JudgeResult | null = localVerdict;
        if (!localVerdict && hand.phase !== "preflop") {
          // LLM judge for postflop
          finalVerdict = await fetchJudge(hand, heroCards, type, amount);
        }

        setState((s) => ({ ...s, verdict: finalVerdict, isGrading: false }));

        if (userId && sessionId) {
          persistHand({ userId, sessionId, hand, action: type, amount, verdict: finalVerdict }).catch(console.error);
        }
      } catch (err) {
        console.error("[heroAct judge]", err);
        setState((s) => ({ ...s, isGrading: false }));
      }
    },
    [state]
  );

  const dismissVerdict = useCallback(() => {
    setState((s) => ({ ...s, verdict: null }));
  }, []);

  return {
    hand: state.hand,
    verdict: state.verdict,
    isThinking: state.isThinking,
    isGrading: state.isGrading,
    dealNewHand,
    heroAct,
    dismissVerdict,
  };
}
