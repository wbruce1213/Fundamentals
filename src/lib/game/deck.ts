import type { Card, Rank, Suit } from "./types";

const RANKS: Rank[] = [
  "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A",
];
const SUITS: Suit[] = ["s", "h", "d", "c"];

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function dealCards(deck: Card[], count: number): [Card[], Card[]] {
  return [deck.slice(0, count), deck.slice(count)];
}

export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function stringToCard(s: string): Card {
  return { rank: s[0] as Rank, suit: s[1] as Suit };
}

export function cardsToString(cards: Card[]): string {
  return cards.map(cardToString).join(" ");
}

export function stringToCards(s: string): Card[] {
  if (!s.trim()) return [];
  return s.trim().split(" ").map(stringToCard);
}

export function handToKey(cards: Card[]): string {
  const [c1, c2] = [...cards].sort((a, b) => {
    const ranks: Rank[] = [
      "2","3","4","5","6","7","8","9","T","J","Q","K","A"
    ];
    return ranks.indexOf(b.rank) - ranks.indexOf(a.rank);
  });
  const suited = c1.suit === c2.suit;
  if (c1.rank === c2.rank) return `${c1.rank}${c2.rank}`;
  return `${c1.rank}${c2.rank}${suited ? "s" : "o"}`;
}
