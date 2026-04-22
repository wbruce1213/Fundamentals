// Pre-computed GTO spots for common poker scenarios
// Format: spot config → solver JSON result

export type SolverSpot = {
  id: string;
  name: string;
  description: string;
  config: {
    pot: number;
    effectiveStack: number;
    board: string;
    rangeIP: string;
    rangeOOP: string;
  };
  // Solver result (truncated for brevity, normally full JSON)
  result: {
    player: number;
    actions: Record<string, string>;
    nodes?: Record<string, Record<string, number>>;
  };
};

// Common 6-max spots
export const PRECOMPUTED_SPOTS: SolverSpot[] = [
  {
    id: "btn-vs-bb-open",
    name: "BTN Open vs BB",
    description: "Button opens, Big Blind defends. Flop: Qs Jh 2h",
    config: {
      pot: 50,
      effectiveStack: 200,
      board: "Qs,Jh,2h",
      rangeIP: "AA,KK,QQ,JJ,TT,99,88,77,66,55,AK,AQ,AJ,AT,A9s,A8s,A7s,A6s,A5s,KQ,KJ,K9s,K8s,QJ,Q9s,JT,J9s,T9s",
      rangeOOP: "QQ,JJ,TT,99,88,77,66,55,44,33,22,AK,AQ,AJ,AT,A9s,A8s,A7s,A6s,A5s,A4s,A3s,A2s,KQ,KJ,KT,K9s,K8s,QJ,QT,Q9s,JT,J9s,T9s,T8s,98s,97s,87s,76s,65s,54s",
    },
    result: {
      player: 1,
      actions: {
        "0": "CHECK",
        "1": "BET 25",
        "2": "BET 50",
        "3": "ALLIN",
      },
      nodes: {
        AA: { check: 0, bet: 100 },
        KK: { check: 5, bet: 95 },
        QQ: { check: 10, bet: 90 },
        AK: { check: 20, bet: 80 },
        AQ: { check: 30, bet: 70 },
        T9s: { check: 70, bet: 30 },
        "98s": { check: 80, bet: 20 },
        "22": { check: 90, bet: 10 },
      },
    },
  },
  {
    id: "co-vs-btn-3bet",
    name: "CO 3-bet vs BTN",
    description: "CO raises, BTN 3-bets. Flop: Ad Kc 7h",
    config: {
      pot: 150,
      effectiveStack: 300,
      board: "Ad,Kc,7h",
      rangeIP: "AA,KK,QQ,AK,AQ",
      rangeOOP: "AA,KK,QQ,JJ,TT,99,AK,AQ,AJ",
    },
    result: {
      player: 0,
      actions: {
        "0": "CHECK",
        "1": "BET 50",
      },
      nodes: {
        AA: { check: 0, bet: 100 },
        KK: { check: 15, bet: 85 },
        AK: { check: 40, bet: 60 },
        AQ: { check: 70, bet: 30 },
      },
    },
  },
  {
    id: "hu-btn-sb",
    name: "Heads-Up BTN vs SB",
    description: "Button raises, Small Blind calls. Flop: 9d 8c 2s",
    config: {
      pot: 40,
      effectiveStack: 150,
      board: "9d,8c,2s",
      rangeIP: "AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AK,AQ,AJ,AT,A9,A8,KQ,KJ,KT,K9,QJ,QT,JT,J9,T9,T8,98,97,87,86,76,75,65,64,54,53,43,42,32",
      rangeOOP: "AA,KK,QQ,JJ,TT,99,88,77,66,55,44,33,22,AK,AQ,AJ,AT,A9,A8,A7,KQ,KJ,KT,K9,K8,QJ,QT,J9,J8,T9,T8,97,96,87,86,85,76,75,74,65,64,63,54,53,52,43,42,32",
    },
    result: {
      player: 0,
      actions: {
        "0": "CHECK",
        "1": "BET 15",
        "2": "BET 30",
      },
      nodes: {
        AA: { check: 0, bet: 100 },
        KK: { check: 5, bet: 95 },
        QQ: { check: 15, bet: 85 },
        AK: { check: 30, bet: 70 },
        AQ: { check: 50, bet: 50 },
        "98": { check: 60, bet: 40 },
        "87": { check: 75, bet: 25 },
        "32": { check: 95, bet: 5 },
      },
    },
  },
];

// Helper to find a spot by ID
export function getSpotById(id: string): SolverSpot | undefined {
  return PRECOMPUTED_SPOTS.find((spot) => spot.id === id);
}

// Helper to list all available spots
export function listAllSpots(): SolverSpot[] {
  return PRECOMPUTED_SPOTS;
}
