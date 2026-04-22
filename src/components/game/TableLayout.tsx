"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import type { HandState, Player, StreetAction } from "@/lib/game/types";
import { getVisibleBoard } from "@/lib/game/state-machine";

// Counterclockwise on screen = clockwise at the physical table.
// Order from BTN going counterclockwise: BTN → SB → BB → LJ → HJ → CO → BTN.
// "cardsAbove" = cards render above seat chip (outside table for top seats).
// For bottom seats, cards render BELOW seat chip (also outside table).
const SEAT_POSITIONS: {
  position: string;
  style: React.CSSProperties;
  cardsAbove: boolean; // true = top seat, false = bottom seat
}[] = [
  { position: "BTN", style: { bottom: "4%",  left: "50%", transform: "translateX(-50%)" }, cardsAbove: false },
  { position: "CO",  style: { bottom: "20%", right: "4%" },                                 cardsAbove: false },
  { position: "HJ",  style: { top: "18%",    right: "4%" },                                 cardsAbove: true  },
  { position: "LJ",  style: { top: "4%",     left: "50%", transform: "translateX(-50%)" }, cardsAbove: true  },
  { position: "SB",  style: { bottom: "20%", left: "4%" },                                  cardsAbove: false },
  // BB is upper-left (one step counterclockwise from LJ at the top)
  { position: "BB",  style: { top: "18%",    left: "4%" },                                  cardsAbove: true  },
];

const ARCHETYPE_STYLES: Record<string, { dot: string; label: string }> = {
  Reg:  { dot: "bg-blue-500",    label: "text-blue-700" },
  Fish: { dot: "bg-amber-400",   label: "text-amber-700" },
  LAG:  { dot: "bg-orange-500",  label: "text-orange-700" },
  Hero: { dot: "bg-emerald-500", label: "text-emerald-700" },
};

// Small chip stack visual — shown between seat and pot
function BetChips({ amount, bigBlind }: { amount: number; bigBlind: number }) {
  if (amount <= 0) return null;
  // Number of chip circles: 1–4, scaled by bet size
  const count = Math.min(4, Math.ceil(amount / bigBlind / 8) + 1);
  return (
    <div className="flex flex-col items-center gap-0.5 py-0.5">
      <div className="relative" style={{ width: 18, height: 8 + count * 4 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="absolute w-[18px] h-[10px] rounded-full bg-emerald-500 border border-emerald-600 shadow-sm"
            style={{ bottom: i * 4 }}
          />
        ))}
      </div>
      <span className="font-card text-[9px] font-semibold text-emerald-700 leading-tight">
        {(amount / bigBlind).toFixed(1)}bb
      </span>
    </div>
  );
}

type SeatProps = {
  player: Player;
  isActive: boolean;
  isHero: boolean;
  isShowdown: boolean;
  cardsAbove: boolean;
  bigBlind: number;
};

function Seat({ player, isActive, isHero, isShowdown, cardsAbove, bigBlind }: SeatProps) {
  const archetypeStyle = ARCHETYPE_STYLES[player.archetype] ?? ARCHETYPE_STYLES.Reg;
  const showFaceUp = (isHero || isShowdown) && !player.isFolded && player.holeCards;

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

  const betChips = <BetChips amount={player.currentBet} bigBlind={bigBlind} />;

  const seatChip = (
    <div
      className={`rounded-lg border px-2 py-1.5 text-center shadow-sm transition-all min-w-[60px] ${
        isActive
          ? "border-emerald-400 bg-emerald-50 shadow-emerald-100"
          : "border-zinc-200 bg-white"
      } ${player.isFolded ? "border-dashed opacity-60" : ""}`}
    >
      <div className="flex items-center justify-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${archetypeStyle.dot}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${archetypeStyle.label}`}>
          {player.position}
        </span>
        {isHero && (
          <span className="rounded bg-emerald-500 px-1 text-[8px] font-bold text-white leading-tight">
            YOU
          </span>
        )}
      </div>
      <div className="text-[11px] font-medium text-zinc-700 leading-tight mt-0.5">
        {player.name}
      </div>
      <div className="font-card text-[10px] text-zinc-400 leading-tight">
        {(player.stack / bigBlind).toFixed(0)}bb
      </div>
      {player.isFolded && (
        <div className="text-[9px] text-zinc-400 tracking-wide mt-0.5">FOLDED</div>
      )}
      {player.isAllIn && (
        <div className="text-[9px] font-semibold text-amber-600 mt-0.5">ALL IN</div>
      )}
    </div>
  );

  return (
    <motion.div
      className="flex flex-col items-center gap-1"
      animate={isActive ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, repeat: isActive ? Infinity : 0, repeatDelay: 0.7 }}
    >
      {cardsAbove ? (
        // Top seats: cards at top (outside table), then seat chip, then bet chips toward center
        <>
          {cards}
          {seatChip}
          {betChips}
        </>
      ) : (
        // Bottom seats: bet chips at top (toward center), then seat chip, then cards outside table
        <>
          {betChips}
          {seatChip}
          {cards}
        </>
      )}
    </motion.div>
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
        <span className="font-card text-[9px] uppercase tracking-widest text-zinc-400">
          {phase}
        </span>
      )}
    </div>
  );
}

function PotDisplay({ pot, bigBlind }: { pot: number; bigBlind: number }) {
  // Chip stack for the pot — more chips = bigger pot
  const chipCount = Math.min(6, Math.ceil(pot / bigBlind / 5) + 1);
  return (
    <div className="flex items-center gap-2 mb-1">
      {/* Pot chips */}
      <div className="relative" style={{ width: 20, height: 10 + chipCount * 3 }}>
        {Array.from({ length: chipCount }).map((_, i) => (
          <div
            key={i}
            className="absolute w-[20px] h-[10px] rounded-full bg-zinc-500 border border-zinc-600 shadow-sm"
            style={{ bottom: i * 3 }}
          />
        ))}
      </div>
      <div className="flex flex-col">
        <div className="font-card text-sm font-semibold text-zinc-700">
          {(pot / bigBlind).toFixed(1)}bb
        </div>
        <div className="text-[9px] text-zinc-400 uppercase tracking-wide leading-tight">pot</div>
      </div>
    </div>
  );
}

function ActionLog({
  actions,
  players,
  bigBlind,
}: {
  actions: StreetAction[];
  players: Player[];
  bigBlind: number;
}) {
  if (actions.length === 0) return null;
  const recent = actions.slice(-5);

  return (
    <div className="flex flex-col items-center gap-0.5 mt-1.5">
      {recent.map((a, i) => {
        const player = players.find((p) => p.id === a.playerId);
        const pos = player?.position ?? "?";
        let label = "";
        switch (a.action.type) {
          case "fold":  label = "folds"; break;
          case "check": label = "checks"; break;
          case "call":  label = "calls"; break;
          case "bet":   label = `bets ${(a.action.amount / bigBlind).toFixed(1)}bb`; break;
          case "raise": label = `raises to ${(a.action.amount / bigBlind).toFixed(1)}bb`; break;
          case "allin": label = "all-in"; break;
        }
        const isMostRecent = i === recent.length - 1;
        return (
          <div key={i} className="flex items-center gap-1.5 font-card text-[10px]">
            <span
              className={`w-6 text-right font-semibold shrink-0 ${
                isMostRecent ? "text-zinc-800" : "text-zinc-500"
              }`}
            >
              {pos}
            </span>
            <span className={isMostRecent ? "text-zinc-700" : "text-zinc-400"}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TableLayout({ state }: { state: HandState }) {
  const board = getVisibleBoard(state);
  const isShowdown = state.phase === "showdown";

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="relative w-full"
        style={{ maxWidth: "760px", aspectRatio: "16/9", maxHeight: "100%" }}
      >
        {/* Outer rim */}
        <div className="absolute inset-[10%] rounded-[50%] border-[3px] border-zinc-300 bg-zinc-100" />
        {/* Inner felt */}
        <div className="absolute inset-[13%] rounded-[50%] bg-zinc-50 border border-zinc-200" />

        {/* Center: pot + board + action log */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <PotDisplay pot={state.pot} bigBlind={state.bigBlindSize} />
          <Board cards={board} phase={state.phase} />
          <ActionLog
            actions={state.streetActions}
            players={state.players}
            bigBlind={state.bigBlindSize}
          />
        </div>

        {/* Seats */}
        {SEAT_POSITIONS.map(({ position, style, cardsAbove }) => {
          const player = state.players.find((p) => p.position === position);
          if (!player) return null;
          const isActive = state.players[state.activePlayerIndex]?.id === player.id;
          return (
            <div key={position} className="absolute" style={style}>
              <Seat
                player={player}
                isActive={isActive}
                isHero={player.isHero}
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
