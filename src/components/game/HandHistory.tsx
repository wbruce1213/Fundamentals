"use client";

import { useRef, useEffect } from "react";
import type { HandHistoryEntry, Player, StreetAction } from "@/lib/game/types";

function actionLabel(a: StreetAction, players: Player[], bigBlind: number): string {
  const pos = players.find((p) => p.id === a.playerId)?.position ?? "?";
  let verb = "";
  switch (a.action.type) {
    case "fold":  verb = "folds"; break;
    case "check": verb = "checks"; break;
    case "call":  verb = "calls"; break;
    case "bet":   verb = `bets ${(a.action.amount / bigBlind).toFixed(1)}bb`; break;
    case "raise": verb = `raises to ${(a.action.amount / bigBlind).toFixed(1)}bb`; break;
    case "allin": verb = "all-in"; break;
  }
  return `${pos}: ${verb}`;
}

type Props = {
  handHistory: HandHistoryEntry[];
  streetActions: StreetAction[];
  currentPhase: string;
  players: Player[];
  bigBlind: number;
};

export function HandHistory({ handHistory, streetActions, currentPhase, players, bigBlind }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new actions arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [handHistory.length, streetActions.length]);

  const allStreets = [
    ...handHistory,
    ...(streetActions.length > 0 ? [{ phase: currentPhase, actions: streetActions }] : []),
  ];

  const hasContent = allStreets.some((s) => s.actions.length > 0);
  if (!hasContent) return null;

  return (
    <div className="w-44 rounded-lg border border-zinc-200 bg-white/95 shadow-sm backdrop-blur-sm overflow-hidden">
      <div className="border-b border-zinc-100 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
        Hand History
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto px-2.5 py-1.5 space-y-2"
        style={{ maxHeight: 200 }}
      >
        {allStreets.map((street, si) => {
          if (street.actions.length === 0) return null;
          const isCurrentStreet = si === allStreets.length - 1;
          return (
            <div key={si}>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 mb-0.5">
                {street.phase}
              </div>
              {street.actions.map((a, ai) => {
                const isNewest = isCurrentStreet && ai === street.actions.length - 1;
                return (
                  <div
                    key={ai}
                    className={`font-card text-[10px] leading-relaxed ${
                      isNewest ? "text-zinc-800 font-semibold" : "text-zinc-500"
                    }`}
                  >
                    {actionLabel(a, players, bigBlind)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
