"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import type { HandState, Player } from "@/lib/game/types";
import { getVisibleBoard } from "@/lib/game/state-machine";

const SEAT_POSITIONS = [
  // BTN = bottom-right, CO = right, HJ = top-right, LJ = top-left, SB = left, BB = bottom-left
  // Elliptical layout. hero is always BTN for rendering (rotated by position in state).
  // Positions are percentages [left, top] of the container.
  { position: "BTN", style: { bottom: "8%", left: "50%", transform: "translateX(-50%)" } },
  { position: "CO", style: { bottom: "22%", right: "8%" } },
  { position: "HJ", style: { top: "22%", right: "8%" } },
  { position: "LJ", style: { top: "22%", left: "8%" } },
  { position: "SB", style: { bottom: "22%", left: "8%" } },
  { position: "BB", style: { top: "8%", left: "50%", transform: "translateX(-50%)" } },
];

type SeatProps = {
  player: Player;
  isActive: boolean;
  isHero: boolean;
  bigBlind: number;
};

function Seat({ player, isActive, isHero, bigBlind }: SeatProps) {
  const archetypeColors: Record<string, string> = {
    Reg: "text-blue-400",
    Fish: "text-yellow-400",
    LAG: "text-orange-400",
    Hero: "text-[oklch(0.72_0.17_145)]",
  };
  const archetypeColor =
    archetypeColors[player.archetype] ?? "text-muted-foreground";

  return (
    <motion.div
      className={`flex flex-col items-center gap-1 ${player.isFolded ? "opacity-30" : ""}`}
      animate={isActive ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ duration: 0.4, repeat: isActive ? Infinity : 0, repeatDelay: 0.8 }}
    >
      {/* Cards */}
      <div className="flex gap-0.5 mb-0.5">
        {player.isHero && player.holeCards ? (
          player.holeCards.map((card, i) => (
            <PlayingCard
              key={i}
              card={card}
              size="sm"
              animate
              delay={i * 0.08}
            />
          ))
        ) : (
          <>
            <PlayingCard faceDown size="sm" />
            <PlayingCard faceDown size="sm" />
          </>
        )}
      </div>

      {/* Seat info chip */}
      <div
        className={`rounded-md border px-2 py-1 text-center transition-colors ${
          isActive
            ? "border-[oklch(0.72_0.17_145)] bg-[oklch(0.72_0.17_145)]/10"
            : "border-border bg-card"
        } ${player.isFolded ? "border-dashed" : ""}`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-medium ${archetypeColor}`}>
            {player.position}
          </span>
          {isHero && (
            <span className="rounded-[2px] bg-[oklch(0.72_0.17_145)] px-1 text-[9px] font-semibold text-black">
              YOU
            </span>
          )}
        </div>
        <div className="text-[11px] font-medium text-foreground leading-tight">
          {player.name}
        </div>
        <div className="font-card text-[10px] text-muted-foreground leading-tight">
          {(player.stack / bigBlind).toFixed(0)}bb
        </div>
        {player.currentBet > 0 && (
          <div className="font-card text-[10px] text-[oklch(0.72_0.17_145)]">
            bet: {(player.currentBet / bigBlind).toFixed(1)}bb
          </div>
        )}
        {player.isFolded && (
          <div className="text-[9px] text-muted-foreground/60">FOLD</div>
        )}
        {player.isAllIn && (
          <div className="text-[9px] text-[oklch(0.75_0.13_88)]">ALL IN</div>
        )}
      </div>
    </motion.div>
  );
}

type BoardProps = {
  cards: ReturnType<typeof getVisibleBoard>;
  phase: string;
};

function Board({ cards, phase }: BoardProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1.5 items-center">
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
        {/* Placeholder slots */}
        {Array.from({ length: Math.max(0, 5 - cards.length) }).map((_, i) => (
          <div
            key={`placeholder-${i}`}
            className="w-12 rounded-[4px] border border-dashed border-border/40"
            style={{ aspectRatio: "2.5/3.5" }}
          />
        ))}
      </div>
      {phase !== "preflop" && (
        <span className="font-card text-[10px] uppercase tracking-widest text-muted-foreground/60">
          {phase}
        </span>
      )}
    </div>
  );
}

type PotDisplayProps = {
  pot: number;
  bigBlind: number;
};

function PotDisplay({ pot, bigBlind }: PotDisplayProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="font-card text-sm font-medium text-foreground">
        {(pot / bigBlind).toFixed(1)}bb
      </div>
      <div className="text-[10px] text-muted-foreground">pot</div>
    </div>
  );
}

type TableLayoutProps = {
  state: HandState;
};

export function TableLayout({ state }: TableLayoutProps) {
  const board = getVisibleBoard(state);
  const heroIdx = state.players.findIndex((p) => p.isHero);

  return (
    <div className="relative w-full" style={{ paddingBottom: "56.25%" /* 16:9 */ }}>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Table ellipse */}
        <div
          className="relative w-full h-full max-w-3xl mx-auto"
          style={{ maxHeight: "480px" }}
        >
          {/* Felt area — schematic ellipse, no green felt per spec */}
          <div
            className="absolute inset-[12%] rounded-[50%] border border-border bg-card/40"
            style={{ borderWidth: "1px" }}
          />

          {/* Center: board + pot */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <PotDisplay pot={state.pot} bigBlind={state.bigBlindSize} />
            <Board cards={board} phase={state.phase} />
          </div>

          {/* Player seats */}
          {SEAT_POSITIONS.map(({ position, style }) => {
            const player = state.players.find((p) => p.position === position);
            if (!player) return null;
            const isActive =
              state.players[state.activePlayerIndex]?.id === player.id;
            return (
              <div
                key={position}
                className="absolute"
                style={style as React.CSSProperties}
              >
                <Seat
                  player={player}
                  isActive={isActive}
                  isHero={player.isHero}
                  bigBlind={state.bigBlindSize}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
