import { describe, expect, it } from "@jest/globals";
import {
  createNewHand,
  applyAction,
  getLegalActions,
  getHero,
  getCallAmount,
  getVisibleBoard,
  computeSPR,
  computePotOdds,
} from "../state-machine";

describe("createNewHand", () => {
  it("creates a hand with 6 players", () => {
    const hand = createNewHand();
    expect(hand.players).toHaveLength(6);
  });

  it("has one hero player", () => {
    const hand = createNewHand();
    const heroes = hand.players.filter((p) => p.isHero);
    expect(heroes).toHaveLength(1);
  });

  it("deals 2 hole cards to each player", () => {
    const hand = createNewHand();
    hand.players.forEach((p) => {
      expect(p.holeCards).toHaveLength(2);
    });
  });

  it("posts blinds correctly", () => {
    const hand = createNewHand();
    const sb = hand.players.find((p) => p.position === "SB")!;
    const bb = hand.players.find((p) => p.position === "BB")!;
    expect(sb.currentBet).toBe(hand.smallBlindSize);
    expect(bb.currentBet).toBe(hand.bigBlindSize);
  });

  it("starts in preflop phase", () => {
    const hand = createNewHand();
    expect(hand.phase).toBe("preflop");
  });

  it("pot equals SB + BB", () => {
    const hand = createNewHand();
    expect(hand.pot).toBe(hand.smallBlindSize + hand.bigBlindSize);
  });
});

describe("getLegalActions", () => {
  it("includes fold when facing a bet", () => {
    const hand = createNewHand();
    const activePlayer = hand.players[hand.activePlayerIndex];
    const actions = getLegalActions(hand, activePlayer);
    expect(actions).toContain("fold");
  });

  it("includes raise when facing the initial BB", () => {
    const hand = createNewHand();
    const activePlayer = hand.players[hand.activePlayerIndex];
    const actions = getLegalActions(hand, activePlayer);
    expect(actions).toContain("raise");
  });
});

describe("applyAction - fold", () => {
  it("marks the player as folded", () => {
    const hand = createNewHand();
    const activeIdx = hand.activePlayerIndex;
    const newHand = applyAction(hand, { type: "fold", amount: 0 });
    expect(newHand.players[activeIdx].isFolded).toBe(true);
  });

  it("advances to the next player", () => {
    const hand = createNewHand();
    const activeIdx = hand.activePlayerIndex;
    const newHand = applyAction(hand, { type: "fold", amount: 0 });
    expect(newHand.activePlayerIndex).not.toBe(activeIdx);
  });
});

describe("applyAction - call", () => {
  it("deducts chips from caller", () => {
    const hand = createNewHand();
    const player = hand.players[hand.activePlayerIndex];
    const callAmt = getCallAmount(hand, player);
    const newHand = applyAction(hand, { type: "call", amount: callAmt });
    expect(newHand.players[hand.activePlayerIndex].stack).toBe(
      player.stack - callAmt
    );
  });
});

describe("getVisibleBoard", () => {
  it("returns empty array for preflop", () => {
    const hand = createNewHand();
    expect(getVisibleBoard(hand)).toHaveLength(0);
  });
});

describe("computeSPR", () => {
  it("computes stack-to-pot ratio", () => {
    expect(computeSPR(1000, 5000)).toBe(5);
  });

  it("returns 999 for empty pot", () => {
    expect(computeSPR(0, 5000)).toBe(999);
  });
});

describe("computePotOdds", () => {
  it("computes pot odds correctly", () => {
    // call 100 into pot of 200 → 100/(300) = 0.33
    expect(computePotOdds(100, 200)).toBeCloseTo(0.33, 1);
  });
});
