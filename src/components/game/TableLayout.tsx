"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import type { HandState, Player } from "@/lib/game/types";
import { getVisibleBoard } from "@/lib/game/state-machine";

// Counterclockwise seating order (standard online poker convention).
// Hero always maps to visual seat 0 (bottom); rotation is computed per-hand.
const CCW_ORDER = ["BTN", "SB", "BB", "LJ", "HJ", "CO"] as const;

const VISUAL_SEATS: { style: React.CSSProperties; cardsAbove: boolean }[] = [
  { style: { bottom: "4%",  left: "50%", transform: "translateX(-50%)" }, cardsAbove: false }, // 0 bottom  (hero)
  { style: { bottom: "20%", left: "4%"  },                                 cardsAbove: false }, // 1 lower-left
  { style: { top:    "18%", left: "4%"  },                                 cardsAbove: true  }, // 2 upper-left
  { style: { top:    "4%",  left: "50%", transform: "translateX(-50%)" },  cardsAbove: true  }, // 3 top
  { style: { top:    "18%", right: "4%" },                                 cardsAbove: true  }, // 4 upper-right
  { style: { bottom: "20%", right: "4%" },                                 cardsAbove: false }, // 5 lower-right
];

const ARCHETYPE_STYLES: Record<string, { dot: string; label: string }> = {
  Reg:  { dot: "bg-blue-500",    label: "text-blue-700"   },
  Fish: { dot: "bg-amber-400",   label: "text-amber-700"  },
  LAG:  { dot: "bg-orange-500",  label: "text-orange-700" },
  Hero: { dot: "bg-emerald-500", label: "text-emerald-700"},
};

function Chips({ amount, bigBlind, color = "emerald" }: {
  amount: number;
  bigBlind: number;
  color?: "emerald" | "zinc";
}) {
  if (amount <= 0) return null;
  const count = Math.min(5, Math.ceil(amount / bigBlind / 6) + 1);
  const bg = color === "emerald"
    ? "bg-emerald-500 border-emerald-700"
    : "bg-zinc-500 border-zinc-600";
  return (
    <div className="flex flex-col items-center gap-0.5 py-0.5">
      <div className="relative" style={{ width: 18, height: 8 + count * 4 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-[18px] h-[9px] rounded-full border ${bg} shadow-sm`}
            style={{ bottom: i * 4 }}
          />
        ))}
      </div>
      <span className={`font-card text-[9px] font-semibold leading-tight ${
        color === "emerald" ? "text-emerald-700" : "text-zinc-600"
      }`}>
        {(amount / bigBlind).toFixed(1)}bb
      </span>
    </div>
  );
}

type SeatProps = {
  player: Player;
  isActive: boolean;
  isShowdown: boolean;
  cardsAbove: boolean;
  bigBlind: number;
};

function Seat({ player, isActive, isShowdown, cardsAbove, bigBlind }: SeatProps) {
  const s = ARCHETYPE_STYLES[player.archetype] ?? ARCHETYPE_STYLES.Reg;
  const showFaceUp = (player.isHero || isShowdown) && !player.isFolded && player.holeCards;

  const cards = (
    <div className="flex gap-0.5">
      {showFaceUp ? (
        player.holeCards!.map((card, i) => (
          <PlayingCard key={i} card={card} size="sm" animate delay={i * 0.08} />
        ))
      ) : (
        <>
          <PlayingCard faceDown size="sm" />
          <PlayingCard faceDown size="sm" />
        </>
      )}
    </div>
  );

  const betChips = <Chips amount={player.currentBet} bigBlind={bigBlind} color="emerald" />;

  const chip = (
    <div
      className={`rounded-lg border px-2 py-1.5 text-center shadow-sm min-w-[56px] transition-colors ${
        isActive ? "border-emerald-400 bg-emerald-50" : "border-zinc-200 bg-white"
      } ${player.isFolded ? "border-dashed" : ""}`}
    >
      <div className="flex items-center justify-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${s.label}`}>
          {player.position}
        </span>
        {player.isHero && (
          <span className="rounded bg-emerald-500 px-1 text-[8px] font-bold text-white">YOU</span>
        )}
      </div>
      <div className="font-card text-[10px] text-zinc-400 leading-tight">
        {(player.stack / bigBlind).toFixed(0)}bb
      </div>
      {player.isFolded && <div className="text-[9px] text-zinc-400 mt-0.5">FOLDED</div>}
      {player.isAllIn  && <div className="text-[9px] font-semibold text-amber-600 mt-0.5">ALL IN</div>}
    </div>
  );

  // No animation on the active-player indicator — just a border change is enough
  return (
    <div className={`flex flex-col items-center gap-1 ${player.isFolded ? "opacity-30" : ""}`}>
      {cardsAbove ? <>{cards}{chip}{betChips}</> : <>{betChips}{chip}{cards}</>}
    </div>
  );
}

function Board({ cards, phase }: { cards: ReturnType<typeof getVisibleBoard>; phase: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex gap-1.5 items-center">
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => (
            <PlayingCard
              key={`${card.rank}${card.suit}`}
              card={card} size="md" animate delay={i * 0.06}
            />
          ))}
        </AnimatePresence>
        {Array.from({ length: Math.max(0, 5 - cards.length) }).map((_, i) => (
          <div
            key={`ph-${i}`}
            className="w-12 rounded-[4px] border border-dashed border-zinc-300 bg-zinc-50/60"
            style={{ aspectRatio: "2.5/3.5" }}
          />
        ))}
      </div>
      {phase !== "preflop" && (
        <span className="font-card text-[9px] uppercase tracking-widest text-zinc-400">{phase}</span>
      )}
    </div>
  );
}

function PotDisplay({ pot, bigBlind }: { pot: number; bigBlind: number }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Chips amount={pot} bigBlind={bigBlind} color="zinc" />
    </div>
  );
}

export function TableLayout({ state }: { state: HandState }) {
  const board = getVisibleBoard(state);
  const isShowdown = state.phase === "showdown";
  const heroPos = state.heroPosition;
  const heroIdx = CCW_ORDER.indexOf(heroPos as typeof CCW_ORDER[number]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="relative w-full"
        style={{ maxWidth: "760px", aspectRatio: "16/9", maxHeight: "100%" }}
      >
        <div className="absolute inset-[10%] rounded-[50%] border-[3px] border-zinc-300 bg-zinc-100" />
        <div className="absolute inset-[13%] rounded-[50%] bg-zinc-50 border border-zinc-200" />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <PotDisplay pot={state.pot} bigBlind={state.bigBlindSize} />
          <Board cards={board} phase={state.phase} />
        </div>

        {CCW_ORDER.map((pos, posIdx) => {
          const player = state.players.find((p) => p.position === pos);
          if (!player) return null;
          const visualIdx = (posIdx - heroIdx + 6) % 6;
          const { style, cardsAbove } = VISUAL_SEATS[visualIdx];
          const isActive = state.players[state.activePlayerIndex]?.id === player.id;
          return (
            <div key={pos} className="absolute" style={style}>
              <Seat
                player={player}
                isActive={isActive}
                isShowdown={isShowdown}
                cardsAbove={cardsAbove}
                bigBlind={state.bigBlindSize}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
