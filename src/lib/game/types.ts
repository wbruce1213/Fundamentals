export type Suit = "s" | "h" | "d" | "c";
export type Rank =
  | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";

export type Card = { rank: Rank; suit: Suit };

export type Position = "BTN" | "CO" | "HJ" | "LJ" | "SB" | "BB";

export type BotArchetype = "Reg" | "Fish" | "LAG";

export type Street = "preflop" | "flop" | "turn" | "river";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise" | "allin";

export type PlayerAction = {
  type: ActionType;
  amount: number; // in chips (0 for fold/check)
};

export type Player = {
  id: string;
  name: string;
  archetype: BotArchetype | "Hero";
  position: Position;
  stack: number;
  holeCards: Card[] | null; // null = not visible
  currentBet: number;
  isActive: boolean; // still in hand
  isFolded: boolean;
  isAllIn: boolean;
  isHero: boolean;
};

export type StreetAction = {
  playerId: string;
  action: PlayerAction;
  timestamp: number;
};

export type HandHistoryEntry = {
  phase: string;
  actions: StreetAction[];
};

export type GamePhase =
  | "dealing"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "complete";

export type HandState = {
  id: string;
  phase: GamePhase;
  players: Player[];
  heroId: string;
  heroPosition: Position;
  deck: Card[];
  board: Card[];
  pot: number;
  sidePots: { amount: number; eligiblePlayerIds: string[] }[];
  currentBet: number;
  minRaise: number;
  activePlayerIndex: number; // index in players array
  lastAggressorIndex: number;
  streetActions: StreetAction[];
  allActions: StreetAction[]; // full history across streets
  handHistory: HandHistoryEntry[]; // completed streets, for display
  bigBlindSize: number;
  smallBlindSize: number;
  awaitingHeroAction: boolean;
  winner: string | null;
};

export type DecisionContext = {
  hand: HandState;
  heroHoleCards: Card[];
  position: Position;
  street: Street;
  potOdds: number | null; // ratio if facing a bet
  effectiveStack: number; // in BBs
  spr: number; // stack-to-pot ratio
};

export type JudgeVerdict =
  | "optimal"
  | "acceptable"
  | "mistake"
  | "blunder";

export type JudgeResult = {
  verdict: JudgeVerdict;
  rating: number; // 0-100
  betterAction?: string;
  primaryReason: string;
  secondaryConsiderations: string[];
  conceptTags: string[];
};
