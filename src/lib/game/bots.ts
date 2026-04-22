import { handToKey } from "./deck";
import type {
  BotArchetype,
  Card,
  HandState,
  Player,
  PlayerAction,
  Position,
  StreetAction,
} from "./types";
import { getCallAmount, getLegalActions } from "./state-machine";

// Pure function bot decisions. Each archetype models a recognizable player type.
// Poker players should be able to read these and point out exploits — that's intentional.

export type BotInput = {
  hole: Card[];
  board: Card[];
  position: Position;
  history: StreetAction[];
  pot: number;
  stack: number;
  currentBet: number;
  bigBlind: number;
  player: Player;
  state: HandState;
};

// ─── Hand strength helpers ───────────────────────────────────────────────────

const RANK_VALUES: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8,
  "9": 9, T: 10, J: 11, Q: 12, K: 13, A: 14,
};

function highCard(cards: Card[]): number {
  return Math.max(...cards.map((c) => RANK_VALUES[c.rank]));
}

// Very rough preflop hand strength score (0-100). Not equity — just a heuristic.
function preflopStrength(hole: Card[]): number {
  const [c1, c2] = hole;
  const r1 = RANK_VALUES[c1.rank];
  const r2 = RANK_VALUES[c2.rank];
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const suited = c1.suit === c2.suit;
  const paired = r1 === r2;
  const gap = hi - lo;

  if (paired) {
    // Pairs: 22=40, AA=100
    return 40 + (hi - 2) * (60 / 12);
  }

  let score = (hi - 2) * 3 + (lo - 2) * 1.5;
  if (suited) score += 8;
  if (gap <= 1) score += 6; // connectors
  if (gap <= 2) score += 3;

  return Math.min(100, Math.max(0, score));
}

// Very rough postflop hand strength (counts pairs, draws roughly)
function postflopStrength(hole: Card[], board: Card[]): number {
  const all = [...hole, ...board];
  const rankCounts: Record<string, number> = {};
  const suitCounts: Record<string, number> = {};

  for (const c of all) {
    rankCounts[c.rank] = (rankCounts[c.rank] ?? 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1;
  }

  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const maxSuit = Math.max(...Object.values(suitCounts));
  const hasFlushDraw = maxSuit >= 4;

  // Check for straights (simplified)
  const uniqueRanks = [...new Set(all.map((c) => RANK_VALUES[c.rank]))].sort(
    (a, b) => a - b
  );
  let maxConsecutive = 1;
  let consecutive = 1;
  for (let i = 1; i < uniqueRanks.length; i++) {
    if (uniqueRanks[i] === uniqueRanks[i - 1] + 1) {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 1;
    }
  }
  const hasStraightDraw = maxConsecutive >= 4;

  if (counts[0] >= 4) return 95; // quads
  if (counts[0] >= 3 && counts[1] >= 2) return 92; // full house
  if (maxSuit >= 5) return 88; // flush
  if (maxConsecutive >= 5) return 85; // straight
  if (counts[0] >= 3) return 75; // trips
  if (counts[0] >= 2 && counts[1] >= 2) return 65; // two pair
  if (counts[0] >= 2) {
    const pairRank = Object.entries(rankCounts).find(([, v]) => v >= 2)![0];
    const pairVal = RANK_VALUES[pairRank];
    const base = 40 + pairVal * 1.5;
    return Math.min(62, base);
  }

  // High card + draws
  let score = highCard(hole) * 1.5;
  if (hasFlushDraw) score += 20;
  if (hasStraightDraw) score += 15;

  return Math.min(38, score);
}

function sizeBet(pot: number, fraction: number, bigBlind: number): number {
  return Math.round(Math.max(pot * fraction, bigBlind * 2) / bigBlind) * bigBlind;
}

// ─── Reg: TAG — plays ~28% VPIP, bets 1/3 to 3/4 pot, folds to 3bets ────────

export function regDecide(input: BotInput): PlayerAction {
  const { hole, board, pot, stack, currentBet, bigBlind, player, state } = input;
  const callAmt = getCallAmount(state, player);
  const isPreflop = board.length === 0;

  if (isPreflop) {
    const strength = preflopStrength(hole);
    // Reg: tight range, standard opens, 3bets top ~9%, calls rarely
    const facing3bet = state.streetActions.filter((a) => a.action.type === "raise").length >= 2;

    if (facing3bet) {
      if (strength >= 85) return { type: "raise", amount: currentBet * 3 }; // 4bet
      if (strength >= 75) return { type: "call", amount: callAmt };
      return { type: "fold", amount: 0 };
    }

    if (currentBet === bigBlind) {
      // RFI opportunity
      if (strength >= 55) return { type: "raise", amount: bigBlind * 2.5 };
      return { type: "fold", amount: 0 };
    }

    if (callAmt > 0) {
      if (strength >= 72) return { type: "raise", amount: currentBet * 3 };
      if (strength >= 52) return { type: "call", amount: callAmt };
      return { type: "fold", amount: 0 };
    }

    return { type: "check", amount: 0 };
  }

  // Postflop
  const strength = postflopStrength(hole, board);
  const potOdds = callAmt > 0 ? callAmt / (pot + callAmt) : 0;
  const legal = getLegalActions(state, player);

  if (callAmt > 0) {
    if (strength >= 75) {
      if (stack > callAmt + bigBlind * 2 && legal.includes("raise")) {
        return { type: "raise", amount: Math.min(currentBet * 2, stack + player.currentBet) };
      }
      return { type: "call", amount: callAmt };
    }
    if (strength >= 55 && potOdds < 0.35) return { type: "call", amount: callAmt };
    if (strength >= 45 && potOdds < 0.25) return { type: "call", amount: callAmt };
    return { type: "fold", amount: 0 };
  }

  // No bet to face — value bet or check
  if (strength >= 75) return { type: "bet", amount: sizeBet(pot, 0.66, bigBlind) };
  if (strength >= 60) return { type: "bet", amount: sizeBet(pot, 0.4, bigBlind) };
  if (strength >= 30 && Math.random() < 0.2) {
    // Occasional bluff
    return { type: "bet", amount: sizeBet(pot, 0.5, bigBlind) };
  }
  return { type: "check", amount: 0 };
}

// ─── Fish: Loose-passive, VPIP ~45%, calls too wide, almost never raises ──────

export function fishDecide(input: BotInput): PlayerAction {
  const { hole, board, pot, stack, currentBet, bigBlind, player, state } = input;
  const callAmt = getCallAmount(state, player);
  const isPreflop = board.length === 0;

  if (isPreflop) {
    const strength = preflopStrength(hole);
    // Fish plays ~45% of hands, mostly by calling
    if (callAmt === 0) {
      if (strength >= 40) return { type: "raise", amount: bigBlind * 2.5 }; // limp-raise occasionally
      return { type: "check", amount: 0 }; // limp (treat as check vs BB option)
    }

    if (strength >= 80) return { type: "raise", amount: currentBet * 3 }; // rare 3bet with monsters
    if (strength >= 35) return { type: "call", amount: callAmt }; // call very wide
    return { type: "fold", amount: 0 };
  }

  // Postflop: fish mostly checks and calls, very rarely folds to single bets
  const strength = postflopStrength(hole, board);
  const potOdds = callAmt > 0 ? callAmt / (pot + callAmt) : 0;

  if (callAmt > 0) {
    if (strength >= 80) return { type: "raise", amount: Math.min(pot, stack + player.currentBet) };
    // Fish calls very wide — practically never folds under 50% pot odds
    if (potOdds < 0.5 || strength >= 40) return { type: "call", amount: callAmt };
    return { type: "fold", amount: 0 };
  }

  // Fish bets made hands, checks draws
  if (strength >= 75) return { type: "bet", amount: sizeBet(pot, 0.75, bigBlind) };
  if (strength >= 55 && Math.random() < 0.4) return { type: "bet", amount: sizeBet(pot, 0.5, bigBlind) };
  return { type: "check", amount: 0 };
}

// ─── LAG: Loose-aggressive, barrels mercilessly, 3bets frequently ─────────────

export function lagDecide(input: BotInput): PlayerAction {
  const { hole, board, pot, stack, currentBet, bigBlind, player, state } = input;
  const callAmt = getCallAmount(state, player);
  const isPreflop = board.length === 0;

  if (isPreflop) {
    const strength = preflopStrength(hole);
    const facing3bet = state.streetActions.filter((a) => a.action.type === "raise").length >= 2;

    if (facing3bet) {
      if (strength >= 78) return { type: "raise", amount: currentBet * 3.5 }; // 4bet
      if (strength >= 55) return { type: "call", amount: callAmt }; // flat some
      return { type: "fold", amount: 0 };
    }

    if (callAmt === 0) {
      if (strength >= 42) return { type: "raise", amount: bigBlind * 2.5 };
      return { type: "check", amount: 0 };
    }

    // LAG 3bets ~15% — much more aggressive
    if (callAmt > 0) {
      if (strength >= 68) return { type: "raise", amount: currentBet * 3.2 };
      if (strength >= 44 && Math.random() < 0.15) return { type: "raise", amount: currentBet * 3 }; // light 3bet
      if (strength >= 36) return { type: "call", amount: callAmt };
      return { type: "fold", amount: 0 };
    }

    return { type: "check", amount: 0 };
  }

  // Postflop: LAG barrels frequently (multi-street bluffing)
  const strength = postflopStrength(hole, board);
  const potOdds = callAmt > 0 ? callAmt / (pot + callAmt) : 0;
  const barrel = Math.random() < 0.55; // will barrel as bluff

  if (callAmt > 0) {
    if (strength >= 70) {
      return { type: "raise", amount: Math.min(currentBet * 2.5, stack + player.currentBet) };
    }
    if (strength >= 45 || (potOdds < 0.35 && barrel)) return { type: "call", amount: callAmt };
    return { type: "fold", amount: 0 };
  }

  // LAG bets frequently
  if (strength >= 65) return { type: "bet", amount: sizeBet(pot, 0.75, bigBlind) };
  if (barrel) return { type: "bet", amount: sizeBet(pot, 0.5, bigBlind) }; // bluff barrel
  return { type: "check", amount: 0 };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function botDecide(
  archetype: BotArchetype,
  input: BotInput
): PlayerAction {
  switch (archetype) {
    case "Reg": return regDecide(input);
    case "Fish": return fishDecide(input);
    case "LAG": return lagDecide(input);
  }
}

export function buildBotInput(state: HandState, player: Player): BotInput {
  const board = state.board.slice(
    0,
    state.phase === "preflop" ? 0
      : state.phase === "flop" ? 3
      : state.phase === "turn" ? 4
      : 5
  );

  return {
    hole: player.holeCards ?? [],
    board,
    position: player.position,
    history: state.allActions,
    pot: state.pot,
    stack: player.stack,
    currentBet: state.currentBet,
    bigBlind: state.bigBlindSize,
    player,
    state,
  };
}
