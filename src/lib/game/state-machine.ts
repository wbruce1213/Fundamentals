import { buildDeck, dealCards, shuffle } from "./deck";
import type {
  ActionType,
  BotArchetype,
  GamePhase,
  HandState,
  Player,
  PlayerAction,
  Position,
  StreetAction,
} from "./types";

const POSITIONS_6MAX: Position[] = ["BTN", "CO", "HJ", "LJ", "SB", "BB"];
const BOT_ARCHETYPES: BotArchetype[] = ["Reg", "Fish", "LAG"];
const BOT_NAMES: Record<BotArchetype, string[]> = {
  Reg: ["Marcus", "Taylor", "Jordan", "Alex"],
  Fish: ["Larry", "Bob", "Dave", "Gary"],
  LAG: ["Kai", "Zara", "Nyx", "Rio"],
};
const BIG_BLIND = 100; // 1bb = 100 chips, 100bb stacks

function randomBotName(archetype: BotArchetype): string {
  const names = BOT_NAMES[archetype];
  return names[Math.floor(Math.random() * names.length)];
}

function randomArchetype(): BotArchetype {
  const weights = [0.45, 0.35, 0.2]; // Reg, Fish, LAG
  const r = Math.random();
  if (r < weights[0]) return "Reg";
  if (r < weights[0] + weights[1]) return "Fish";
  return "LAG";
}

export function createNewHand(heroPosition?: Position): HandState {
  const pos = heroPosition ?? POSITIONS_6MAX[Math.floor(Math.random() * 6)];
  const heroPositionIdx = POSITIONS_6MAX.indexOf(pos);

  const deck = shuffle(buildDeck());
  let remaining = deck;

  const players: Player[] = POSITIONS_6MAX.map((position, idx) => {
    const isHero = position === pos;
    const [cards, newRemaining] = dealCards(remaining, 2);
    remaining = newRemaining;

    let archetype: BotArchetype = "Reg";
    if (!isHero) archetype = randomArchetype();

    return {
      id: isHero ? "hero" : `bot_${idx}`,
      name: isHero ? "Hero" : randomBotName(archetype),
      archetype: isHero ? "Hero" : archetype,
      position,
      stack: 100 * BIG_BLIND,
      holeCards: isHero ? cards : cards, // bots have cards but they aren't shown
      currentBet: 0,
      isActive: true,
      isFolded: false,
      isAllIn: false,
      isHero,
    };
  });

  // Post blinds
  const sbIdx = POSITIONS_6MAX.indexOf("SB");
  const bbIdx = POSITIONS_6MAX.indexOf("BB");
  players[sbIdx].currentBet = BIG_BLIND / 2;
  players[sbIdx].stack -= BIG_BLIND / 2;
  players[bbIdx].currentBet = BIG_BLIND;
  players[bbIdx].stack -= BIG_BLIND;

  const [boardCards, finalRemaining] = dealCards(remaining, 5);

  // Preflop action starts left of BB (LJ in 6-max)
  const firstToActPreflop = (bbIdx + 1) % 6;

  return {
    id: crypto.randomUUID(),
    phase: "preflop",
    players,
    heroId: "hero",
    heroPosition: pos,
    deck: finalRemaining,
    board: boardCards, // all 5 dealt upfront, revealed progressively
    pot: BIG_BLIND + BIG_BLIND / 2,
    sidePots: [],
    currentBet: BIG_BLIND,
    minRaise: BIG_BLIND * 2,
    activePlayerIndex: firstToActPreflop,
    lastAggressorIndex: bbIdx,
    streetActions: [],
    allActions: [],
    bigBlindSize: BIG_BLIND,
    smallBlindSize: BIG_BLIND / 2,
    awaitingHeroAction: players[firstToActPreflop].isHero,
    winner: null,
  };
}

export function getActivePlayer(state: HandState): Player {
  return state.players[state.activePlayerIndex];
}

export function getHero(state: HandState): Player {
  return state.players.find((p) => p.isHero)!;
}

export function getVisibleBoard(state: HandState): typeof state.board {
  switch (state.phase) {
    case "preflop": return [];
    case "flop": return state.board.slice(0, 3);
    case "turn": return state.board.slice(0, 4);
    case "river":
    case "showdown":
    case "complete": return state.board;
    default: return [];
  }
}

export function getCallAmount(state: HandState, player: Player): number {
  return Math.min(state.currentBet - player.currentBet, player.stack);
}

export function getLegalActions(
  state: HandState,
  player: Player
): ActionType[] {
  const callAmt = getCallAmount(state, player);
  const actions: ActionType[] = ["fold"];

  if (callAmt === 0) {
    actions.push("check");
  } else {
    actions.push("call");
  }

  if (player.stack > callAmt) {
    actions.push(state.currentBet > 0 ? "raise" : "bet");
    if (player.stack > 0) actions.push("allin");
  }

  return actions;
}

function nextActivePlayerIndex(
  state: HandState,
  fromIndex: number
): number {
  let idx = (fromIndex + 1) % state.players.length;
  let tries = 0;
  while (
    (state.players[idx].isFolded || state.players[idx].isAllIn) &&
    tries < state.players.length
  ) {
    idx = (idx + 1) % state.players.length;
    tries++;
  }
  return idx;
}

function activePlayers(state: HandState): Player[] {
  return state.players.filter((p) => !p.isFolded && !p.isAllIn);
}

function isStreetOver(state: HandState): boolean {
  const active = activePlayers(state);
  if (active.length <= 1) return true;

  // Street ends when all active players have matched the current bet
  // and action has come back around to the last aggressor
  const allCalled = active.every((p) => p.currentBet === state.currentBet);
  if (!allCalled) return false;

  // Also need at least one full orbit since last aggression
  const lastAggressorId =
    state.players[state.lastAggressorIndex]?.id;
  const nextIdx = nextActivePlayerIndex(state, state.lastAggressorIndex);
  return state.players[nextIdx].id !== lastAggressorId || active.length === 1;
}

function advanceStreet(state: HandState): HandState {
  const phaseOrder: GamePhase[] = [
    "preflop",
    "flop",
    "turn",
    "river",
    "showdown",
    "complete",
  ];
  const currentIdx = phaseOrder.indexOf(state.phase);
  const nextPhase = phaseOrder[currentIdx + 1] ?? "complete";

  // Collect bets into pot
  let newPot = state.pot;
  const newPlayers = state.players.map((p) => {
    newPot += p.currentBet;
    return { ...p, currentBet: 0 };
  });

  // First to act postflop is first active player left of BTN (SB if active)
  const sbIdx = POSITIONS_6MAX.indexOf("SB");
  let firstToAct = sbIdx;
  for (let i = 0; i < newPlayers.length; i++) {
    const idx = (sbIdx + i) % newPlayers.length;
    if (!newPlayers[idx].isFolded && !newPlayers[idx].isAllIn) {
      firstToAct = idx;
      break;
    }
  }

  const newState: HandState = {
    ...state,
    phase: nextPhase,
    players: newPlayers,
    pot: newPot,
    currentBet: 0,
    minRaise: state.bigBlindSize,
    activePlayerIndex: firstToAct,
    lastAggressorIndex: firstToAct,
    streetActions: [],
    allActions: [...state.allActions, ...state.streetActions],
    awaitingHeroAction: newPlayers[firstToAct].isHero,
  };

  return newState;
}

export function applyAction(
  state: HandState,
  action: PlayerAction
): HandState {
  const player = state.players[state.activePlayerIndex];
  if (!player) return state;

  let newPlayers = [...state.players];
  let newPot = state.pot;
  let newCurrentBet = state.currentBet;
  let newMinRaise = state.minRaise;
  let newLastAggressor = state.lastAggressorIndex;

  const strAction: StreetAction = {
    playerId: player.id,
    action,
    timestamp: Date.now(),
  };

  switch (action.type) {
    case "fold": {
      newPlayers[state.activePlayerIndex] = {
        ...player,
        isFolded: true,
        isActive: false,
      };
      break;
    }
    case "check": {
      // No change to pot or bets
      break;
    }
    case "call": {
      const callAmt = Math.min(
        newCurrentBet - player.currentBet,
        player.stack
      );
      newPlayers[state.activePlayerIndex] = {
        ...player,
        currentBet: player.currentBet + callAmt,
        stack: player.stack - callAmt,
        isAllIn: player.stack <= callAmt,
      };
      break;
    }
    case "bet":
    case "raise": {
      const totalBet = action.amount;
      const additionalChips = totalBet - player.currentBet;
      const raiseBy = totalBet - newCurrentBet;
      newMinRaise = newCurrentBet + Math.max(raiseBy, state.bigBlindSize);
      newCurrentBet = totalBet;
      newLastAggressor = state.activePlayerIndex;
      newPlayers[state.activePlayerIndex] = {
        ...player,
        currentBet: totalBet,
        stack: player.stack - additionalChips,
        isAllIn: player.stack <= additionalChips,
      };
      break;
    }
    case "allin": {
      const allInTotal = player.currentBet + player.stack;
      if (allInTotal > newCurrentBet) {
        newCurrentBet = allInTotal;
        newLastAggressor = state.activePlayerIndex;
        newMinRaise = newCurrentBet + (allInTotal - state.currentBet);
      }
      newPlayers[state.activePlayerIndex] = {
        ...player,
        currentBet: allInTotal,
        stack: 0,
        isAllIn: true,
      };
      break;
    }
  }

  const newStreetActions = [...state.streetActions, strAction];
  const newNextIdx = nextActivePlayerIndex(
    { ...state, players: newPlayers },
    state.activePlayerIndex
  );

  let newState: HandState = {
    ...state,
    players: newPlayers,
    pot: newPot,
    currentBet: newCurrentBet,
    minRaise: newMinRaise,
    lastAggressorIndex: newLastAggressor,
    activePlayerIndex: newNextIdx,
    streetActions: newStreetActions,
    awaitingHeroAction: newPlayers[newNextIdx]?.isHero ?? false,
  };

  // Check if only one player remains
  const stillActive = newPlayers.filter((p) => !p.isFolded);
  if (stillActive.length === 1) {
    newState = { ...newState, phase: "complete", winner: stillActive[0].id };
    return newState;
  }

  // Check if street is over
  if (
    isStreetOver(newState) &&
    newState.phase !== "complete" &&
    newState.phase !== "showdown"
  ) {
    if (newState.phase === "river") {
      return { ...advanceStreet(newState), phase: "showdown" };
    }
    return advanceStreet(newState);
  }

  return newState;
}

export function computeSPR(pot: number, effectiveStack: number): number {
  if (pot === 0) return 999;
  return Math.round((effectiveStack / pot) * 10) / 10;
}

export function computePotOdds(callAmt: number, pot: number): number {
  const total = pot + callAmt;
  if (total === 0) return 0;
  return Math.round((callAmt / total) * 100) / 100;
}
