import { describe, expect, it } from "@jest/globals";
import { regDecide, fishDecide, lagDecide } from "../bots";
import { createNewHand, getActivePlayer } from "../state-machine";
import type { BotInput } from "../bots";

// Helper to build a minimal BotInput
function makeBotInput(overrides: Partial<BotInput> = {}): BotInput {
  const hand = createNewHand();
  const player = getActivePlayer(hand);
  return {
    hole: player.holeCards ?? [],
    board: [],
    position: player.position,
    history: [],
    pot: hand.pot,
    stack: player.stack,
    currentBet: hand.currentBet,
    bigBlind: hand.bigBlindSize,
    player,
    state: hand,
    ...overrides,
  };
}

describe("regDecide", () => {
  it("returns a valid action", () => {
    const input = makeBotInput();
    const action = regDecide(input);
    expect(["fold", "check", "call", "bet", "raise", "allin"]).toContain(
      action.type
    );
  });

  it("folds weak hands to a 3bet", () => {
    const hand = createNewHand();
    // Simulate two raises already happened
    const twoRaises = [
      { playerId: "p1", action: { type: "raise" as const, amount: 300 }, timestamp: 0 },
      { playerId: "p2", action: { type: "raise" as const, amount: 900 }, timestamp: 1 },
    ];
    const player = getActivePlayer(hand);
    const input = makeBotInput({
      hole: [{ rank: "7", suit: "s" }, { rank: "2", suit: "d" }], // weak hand
      currentBet: 900,
      state: { ...hand, streetActions: twoRaises },
    });
    const action = regDecide(input);
    expect(action.type).toBe("fold");
  });
});

describe("fishDecide", () => {
  it("returns a valid action", () => {
    const input = makeBotInput();
    const action = fishDecide(input);
    expect(["fold", "check", "call", "bet", "raise", "allin"]).toContain(
      action.type
    );
  });

  it("calls wide preflop (medium strength hand)", () => {
    const hand = createNewHand();
    const input = makeBotInput({
      // Q9o: score = (12-2)*3 + (9-2)*1.5 = 30 + 10.5 = 40.5 > 35 threshold
      hole: [{ rank: "Q", suit: "h" }, { rank: "9", suit: "c" }],
      currentBet: 250,
    });
    const action = fishDecide(input);
    expect(action.type).not.toBe("fold");
  });
});

describe("lagDecide", () => {
  it("returns a valid action", () => {
    const input = makeBotInput();
    const action = lagDecide(input);
    expect(["fold", "check", "call", "bet", "raise", "allin"]).toContain(
      action.type
    );
  });

  it("raises or calls preflop with a strong hand", () => {
    const input = makeBotInput({
      hole: [{ rank: "A", suit: "s" }, { rank: "K", suit: "h" }],
      currentBet: 250,
    });
    const action = lagDecide(input);
    expect(["raise", "call"]).toContain(action.type);
  });
});

describe("bot actions always return valid amounts", () => {
  it("all bots return non-negative amounts", () => {
    for (const fn of [regDecide, fishDecide, lagDecide]) {
      const input = makeBotInput();
      const action = fn(input);
      expect(action.amount).toBeGreaterThanOrEqual(0);
    }
  });
});
