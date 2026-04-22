"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import type { HandState, Player } from "@/lib/game/types";
import { getVisibleBoard } from "@/lib/game/state-machine";

const SEAT_POSITIONS = [
  { position: "BTN", style: { bottom: "6%",  left: "50%",  transform: "translateX(-50%)" } },
  { position: "CO",  style: { bottom: "20%", right: "6%" } },
  { position: "HJ",  style: { top: "20%",    right: "6%" } },
  { position: "LJ",  style: { top: "20%",    left: "6%" } },
  { position: "SB",  style: { bottom: "20%", left: "6%" } },
  { position: "BB",  style: { top: "6%",     left: "50%", transform: "translateX(-50%)" } },
];

const ARCHETYPE_STYLES: Record<string, { dot: string; label: string }> = {
  Reg:  { dot: "bg-blue-500",    label: "text-blue-700" },
  Fish: { dot: "bg-amber-400",   label: "text-amber-700" },
  LAG:  { dot: "bg-orange-500",  label: "text-orange-700" },
  Hero: { dot: "bg-emerald-500", label: "text-emerald-700" },
};

type SeatProps = {
  player: Player;
  isActive: boolean;
  isHero: boolean;
  isShowdown: boolean;
  bigBlind: number;
};

function Seat({ player, isActive, isHero, isShowdown, bigBlind }: SeatProps) {
  const style = ARCHETYPE_STYLES[player.archetype] ?? ARCHETYPE_STYLES.Reg;
  // Show cards face-up for hero always, and for all non-folded players at showdown
  const showFaceUp = (isHero || isShowdown) && !player.isFolded && player.holeCards;

  return (
    <motion.div
      className={`flex flex-col items-center gap-1 transition-opacity ${player.isFolded ? "opacity-25" : ""}`}
      animate={isActive ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, repeat: isActive ? Infinity : 0, repeatDelay: 0.7 }}
    >
      {/* Hole cards */}
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

      {/* Seat chip */}
      <div
        className={`rounded-lg border px-2.5 py-1.5 text-center shadow-sm transition-all ${
          isActive
            ? "border-emerald-400 bg-emerald-50 shadow-emerald-100"
            : "border-zinc-200 bg-white"
        } ${player.isFolded ? "border-dashed" : ""}`}
      >
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${style.label}`}>
            {player.position}
          </span>
          {isHero && (
            <span className="rounded bg-emerald-500 px-1 text-[8px] font-bold text-white leading-tight">
              YOU
            </span>
          )}
        </div>

        <div className="text-[11px] font-medium text-zinc-700 leading-tight">
          {player.name}
        </div>
        <div className="font-card text-[10px] text-zinc-400 leading-tight">
          {(player.stack / bigBlind).toFixed(0)}bb
        </div>

        {player.currentBet > 0 && (
          <div className="font-card text-[10px] text-emerald-600 font-medium">
            {(player.currentBet / bigBlind).toFixed(1)}bb
          </div>
        )}
        {player.isFolded && (
          <div className="text-[9px] text-zinc-400 tracking-wide">FOLDED</div>
        )}
        {player.isAllIn && (
          <div className="text-[9px] font-semibold text-amber-600">ALL IN</div>
        )}
      </div>
    </motion.div>
  );
}

function Board({ cards, phase }: { cards: ReturnType<typeof getVisibleBoard>; phase: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2 items-center">
        <AnimatePresence mode="popLayout">
          {cards.map((card, i) => (
            <PlayingCard
              key={`${card.rank}${card.suit}`}
              card={card}
              size="md"
              animate
              delay={i * 0.06}
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
        <span className="font-card text-[10px] uppercase tracking-widest text-zinc-400">
          {phase === "showdown" ? "showdown" : phase}
        </span>
      )}
    </div>
  );
}

function PotDisplay({ pot, bigBlind }: { pot: number; bigBlind: number }) {
  return (
    <div className="flex flex-col items-center mb-1">
      <div className="font-card text-sm font-semibold text-zinc-700">
        {(pot / bigBlind).toFixed(1)}bb
      </div>
      <div className="text-[10px] text-zinc-400 uppercase tracking-wide">pot</div>
    </div>
  );
}

export function TableLayout({ state }: { state: HandState }) {
  const board = getVisibleBoard(state);
  const isShowdown = state.phase === "showdown";

  return (
    // Fill the parent height, don't use the paddingBottom aspect-ratio hack which overflows
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="relative w-full"
        // Constrain so the table never taller than the available space.
        // The inner ellipse uses percentage-based insets so it scales naturally.
        style={{ maxWidth: "720px", aspectRatio: "16/9", maxHeight: "100%" }}
      >
        {/* Outer rim */}
        <div className="absolute inset-[10%] rounded-[50%] border-[3px] border-zinc-300 bg-zinc-100" />

        {/* Inner felt surface */}
        <div className="absolute inset-[13%] rounded-[50%] bg-zinc-50 border border-zinc-200" />

        {/* Center: pot + board */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <PotDisplay pot={state.pot} bigBlind={state.bigBlindSize} />
          <Board cards={board} phase={state.phase} />
        </div>

        {/* Seats */}
        {SEAT_POSITIONS.map(({ position, style }) => {
          const player = state.players.find((p) => p.position === position);
          if (!player) return null;
          const isActive = state.players[state.activePlayerIndex]?.id === player.id;
          return (
            <div key={position} className="absolute" style={style as React.CSSProperties}>
              <Seat
                player={player}
                isActive={isActive}
                isHero={player.isHero}
                isShowdown={isShowdown}
                bigBlind={state.bigBlindSize}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
