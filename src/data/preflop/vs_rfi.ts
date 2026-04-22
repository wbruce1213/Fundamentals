// vs RFI ranges (calling and 3-betting when facing a single raise)
// Source: PokerCoaching.com intro charts
// Call freq: flatting the raise. Raise (3bet) freq: re-raising.

export type VsRFIFrequencies = {
  raise: number; // 3-bet
  call: number;
  fold: number;
};

export type VsRFIRange = Record<string, VsRFIFrequencies>;

// BB defense vs BTN open — defend wide, mix 3bets and calls
export const BB_VS_BTN: VsRFIRange = {
  AA: { raise: 1, call: 0, fold: 0 }, KK: { raise: 1, call: 0, fold: 0 },
  QQ: { raise: 1, call: 0, fold: 0 }, JJ: { raise: 0.6, call: 0.4, fold: 0 },
  TT: { raise: 0.4, call: 0.6, fold: 0 }, "99": { raise: 0.2, call: 0.8, fold: 0 },
  "88": { raise: 0, call: 1, fold: 0 }, "77": { raise: 0, call: 1, fold: 0 },
  "66": { raise: 0, call: 1, fold: 0 }, "55": { raise: 0, call: 1, fold: 0 },
  "44": { raise: 0, call: 0.8, fold: 0.2 }, "33": { raise: 0, call: 0.7, fold: 0.3 },
  "22": { raise: 0, call: 0.6, fold: 0.4 },
  AKs: { raise: 1, call: 0, fold: 0 }, AKo: { raise: 1, call: 0, fold: 0 },
  AQs: { raise: 0.8, call: 0.2, fold: 0 }, AQo: { raise: 0.5, call: 0.5, fold: 0 },
  AJs: { raise: 0.3, call: 0.7, fold: 0 }, AJo: { raise: 0, call: 0.9, fold: 0.1 },
  ATs: { raise: 0.3, call: 0.7, fold: 0 }, ATo: { raise: 0, call: 0.8, fold: 0.2 },
  A9s: { raise: 0.2, call: 0.8, fold: 0 }, A9o: { raise: 0, call: 0.5, fold: 0.5 },
  A8s: { raise: 0.2, call: 0.8, fold: 0 }, A7s: { raise: 0.2, call: 0.8, fold: 0 },
  A6s: { raise: 0.2, call: 0.8, fold: 0 }, A5s: { raise: 0.5, call: 0.5, fold: 0 },
  A4s: { raise: 0.3, call: 0.7, fold: 0 }, A3s: { raise: 0.2, call: 0.8, fold: 0 },
  A2s: { raise: 0.1, call: 0.9, fold: 0 }, A8o: { raise: 0, call: 0.5, fold: 0.5 },
  A7o: { raise: 0, call: 0.3, fold: 0.7 }, A6o: { raise: 0, call: 0.2, fold: 0.8 },
  A5o: { raise: 0, call: 0.2, fold: 0.8 }, A4o: { raise: 0, call: 0, fold: 1 },
  KQs: { raise: 0.3, call: 0.7, fold: 0 }, KQo: { raise: 0.1, call: 0.9, fold: 0 },
  KJs: { raise: 0.1, call: 0.9, fold: 0 }, KJo: { raise: 0, call: 0.7, fold: 0.3 },
  KTs: { raise: 0.1, call: 0.9, fold: 0 }, KTo: { raise: 0, call: 0.6, fold: 0.4 },
  K9s: { raise: 0, call: 1, fold: 0 }, K9o: { raise: 0, call: 0.3, fold: 0.7 },
  K8s: { raise: 0, call: 0.9, fold: 0.1 }, K7s: { raise: 0, call: 0.8, fold: 0.2 },
  K6s: { raise: 0, call: 0.7, fold: 0.3 }, K5s: { raise: 0, call: 0.5, fold: 0.5 },
  K4s: { raise: 0, call: 0.3, fold: 0.7 }, K3s: { raise: 0, call: 0.2, fold: 0.8 },
  K2s: { raise: 0, call: 0.1, fold: 0.9 },
  QJs: { raise: 0.1, call: 0.9, fold: 0 }, QJo: { raise: 0, call: 0.7, fold: 0.3 },
  QTs: { raise: 0, call: 1, fold: 0 }, QTo: { raise: 0, call: 0.6, fold: 0.4 },
  Q9s: { raise: 0, call: 0.9, fold: 0.1 }, Q8s: { raise: 0, call: 0.7, fold: 0.3 },
  Q7s: { raise: 0, call: 0.5, fold: 0.5 }, Q6s: { raise: 0, call: 0.3, fold: 0.7 },
  JTs: { raise: 0.1, call: 0.9, fold: 0 }, JTo: { raise: 0, call: 0.7, fold: 0.3 },
  J9s: { raise: 0, call: 0.9, fold: 0.1 }, J8s: { raise: 0, call: 0.7, fold: 0.3 },
  J7s: { raise: 0, call: 0.4, fold: 0.6 },
  T9s: { raise: 0, call: 1, fold: 0 }, T8s: { raise: 0, call: 0.8, fold: 0.2 },
  T7s: { raise: 0, call: 0.5, fold: 0.5 },
  "98s": { raise: 0, call: 1, fold: 0 }, "97s": { raise: 0, call: 0.7, fold: 0.3 },
  "96s": { raise: 0, call: 0.4, fold: 0.6 },
  "87s": { raise: 0, call: 0.9, fold: 0.1 }, "86s": { raise: 0, call: 0.6, fold: 0.4 },
  "76s": { raise: 0, call: 0.8, fold: 0.2 }, "75s": { raise: 0, call: 0.5, fold: 0.5 },
  "65s": { raise: 0, call: 0.7, fold: 0.3 }, "64s": { raise: 0, call: 0.4, fold: 0.6 },
  "54s": { raise: 0, call: 0.6, fold: 0.4 }, "53s": { raise: 0, call: 0.3, fold: 0.7 },
  "43s": { raise: 0, call: 0.4, fold: 0.6 },
};

// BB defense vs CO
export const BB_VS_CO: VsRFIRange = {
  AA: { raise: 1, call: 0, fold: 0 }, KK: { raise: 1, call: 0, fold: 0 },
  QQ: { raise: 1, call: 0, fold: 0 }, JJ: { raise: 0.7, call: 0.3, fold: 0 },
  TT: { raise: 0.4, call: 0.6, fold: 0 }, "99": { raise: 0.2, call: 0.8, fold: 0 },
  "88": { raise: 0, call: 1, fold: 0 }, "77": { raise: 0, call: 1, fold: 0 },
  "66": { raise: 0, call: 1, fold: 0 }, "55": { raise: 0, call: 0.9, fold: 0.1 },
  "44": { raise: 0, call: 0.7, fold: 0.3 }, "33": { raise: 0, call: 0.5, fold: 0.5 },
  "22": { raise: 0, call: 0.4, fold: 0.6 },
  AKs: { raise: 1, call: 0, fold: 0 }, AKo: { raise: 1, call: 0, fold: 0 },
  AQs: { raise: 0.9, call: 0.1, fold: 0 }, AQo: { raise: 0.5, call: 0.5, fold: 0 },
  AJs: { raise: 0.4, call: 0.6, fold: 0 }, AJo: { raise: 0, call: 0.8, fold: 0.2 },
  ATs: { raise: 0.3, call: 0.7, fold: 0 }, ATo: { raise: 0, call: 0.7, fold: 0.3 },
  A9s: { raise: 0.2, call: 0.8, fold: 0 }, A8s: { raise: 0.2, call: 0.8, fold: 0 },
  A7s: { raise: 0.2, call: 0.8, fold: 0 }, A6s: { raise: 0.2, call: 0.8, fold: 0 },
  A5s: { raise: 0.5, call: 0.5, fold: 0 }, A4s: { raise: 0.3, call: 0.7, fold: 0 },
  A3s: { raise: 0.1, call: 0.9, fold: 0 }, A2s: { raise: 0, call: 0.9, fold: 0.1 },
  KQs: { raise: 0.4, call: 0.6, fold: 0 }, KQo: { raise: 0.1, call: 0.9, fold: 0 },
  KJs: { raise: 0.1, call: 0.9, fold: 0 }, KTs: { raise: 0, call: 1, fold: 0 },
  K9s: { raise: 0, call: 0.9, fold: 0.1 }, K8s: { raise: 0, call: 0.8, fold: 0.2 },
  K7s: { raise: 0, call: 0.6, fold: 0.4 },
  QJs: { raise: 0.1, call: 0.9, fold: 0 }, QTs: { raise: 0, call: 1, fold: 0 },
  Q9s: { raise: 0, call: 0.8, fold: 0.2 }, Q8s: { raise: 0, call: 0.6, fold: 0.4 },
  JTs: { raise: 0.1, call: 0.9, fold: 0 }, J9s: { raise: 0, call: 0.8, fold: 0.2 },
  T9s: { raise: 0, call: 0.9, fold: 0.1 }, T8s: { raise: 0, call: 0.7, fold: 0.3 },
  "98s": { raise: 0, call: 0.9, fold: 0.1 }, "97s": { raise: 0, call: 0.6, fold: 0.4 },
  "87s": { raise: 0, call: 0.8, fold: 0.2 }, "76s": { raise: 0, call: 0.7, fold: 0.3 },
  "65s": { raise: 0, call: 0.6, fold: 0.4 }, "54s": { raise: 0, call: 0.5, fold: 0.5 },
};

// BB defense vs LJ/HJ (tighter, use CO as proxy with slight adjustments)
export const BB_VS_LJ: VsRFIRange = {
  AA: { raise: 1, call: 0, fold: 0 }, KK: { raise: 1, call: 0, fold: 0 },
  QQ: { raise: 1, call: 0, fold: 0 }, JJ: { raise: 0.8, call: 0.2, fold: 0 },
  TT: { raise: 0.5, call: 0.5, fold: 0 }, "99": { raise: 0.3, call: 0.7, fold: 0 },
  "88": { raise: 0.1, call: 0.9, fold: 0 }, "77": { raise: 0, call: 0.9, fold: 0.1 },
  "66": { raise: 0, call: 0.8, fold: 0.2 }, "55": { raise: 0, call: 0.7, fold: 0.3 },
  "44": { raise: 0, call: 0.5, fold: 0.5 }, "33": { raise: 0, call: 0.3, fold: 0.7 },
  "22": { raise: 0, call: 0.2, fold: 0.8 },
  AKs: { raise: 1, call: 0, fold: 0 }, AKo: { raise: 1, call: 0, fold: 0 },
  AQs: { raise: 1, call: 0, fold: 0 }, AQo: { raise: 0.7, call: 0.3, fold: 0 },
  AJs: { raise: 0.5, call: 0.5, fold: 0 }, AJo: { raise: 0.1, call: 0.9, fold: 0 },
  ATs: { raise: 0.4, call: 0.6, fold: 0 }, ATo: { raise: 0, call: 0.7, fold: 0.3 },
  A9s: { raise: 0.3, call: 0.7, fold: 0 }, A8s: { raise: 0.2, call: 0.8, fold: 0 },
  A7s: { raise: 0.2, call: 0.8, fold: 0 }, A5s: { raise: 0.5, call: 0.5, fold: 0 },
  A4s: { raise: 0.2, call: 0.8, fold: 0 }, A3s: { raise: 0.1, call: 0.9, fold: 0 },
  A2s: { raise: 0, call: 0.8, fold: 0.2 },
  KQs: { raise: 0.4, call: 0.6, fold: 0 }, KQo: { raise: 0.2, call: 0.8, fold: 0 },
  KJs: { raise: 0.2, call: 0.8, fold: 0 }, KTs: { raise: 0.1, call: 0.9, fold: 0 },
  K9s: { raise: 0, call: 0.8, fold: 0.2 },
  QJs: { raise: 0.2, call: 0.8, fold: 0 }, QTs: { raise: 0.1, call: 0.9, fold: 0 },
  JTs: { raise: 0.2, call: 0.8, fold: 0 }, J9s: { raise: 0, call: 0.7, fold: 0.3 },
  T9s: { raise: 0, call: 0.8, fold: 0.2 }, "98s": { raise: 0, call: 0.7, fold: 0.3 },
  "87s": { raise: 0, call: 0.7, fold: 0.3 }, "76s": { raise: 0, call: 0.6, fold: 0.4 },
  "65s": { raise: 0, call: 0.5, fold: 0.5 },
};

export const VS_RFI_RANGES: Record<string, Record<string, VsRFIRange>> = {
  BB: {
    BTN: BB_VS_BTN,
    CO: BB_VS_CO,
    HJ: BB_VS_LJ,
    LJ: BB_VS_LJ,
    SB: BB_VS_CO, // approximate
  },
};
