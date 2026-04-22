"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import type { SolverSpot } from "@/lib/solver/spots";

type StrategyGridCell = {
  hand: string;
  check?: number;
  bet?: number;
  raise?: number;
  fold?: number;
  call?: number;
};

// 13x13 hand grid
const HAND_GRID = [
  ["AA", "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s"],
  ["AKo", "KK", "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s"],
  ["AQo", "KQo", "QQ", "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s"],
  ["AJo", "KJo", "QJo", "JJ", "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s", "J3s", "J2s"],
  ["ATo", "KTo", "QTo", "JTo", "TT", "T9s", "T8s", "T7s", "T6s", "T5s", "T4s", "T3s", "T2s"],
  ["A9o", "K9o", "Q9o", "J9o", "T9o", "99", "98s", "97s", "96s", "95s", "94s", "93s", "92s"],
  ["A8o", "K8o", "Q8o", "J8o", "T8o", "98o", "88", "87s", "86s", "85s", "84s", "83s", "82s"],
  ["A7o", "K7o", "Q7o", "J7o", "T7o", "97o", "87o", "77", "76s", "75s", "74s", "73s", "72s"],
  ["A6o", "K6o", "Q6o", "J6o", "T6o", "96o", "86o", "76o", "66", "65s", "64s", "63s", "62s"],
  ["A5o", "K5o", "Q5o", "J5o", "T5o", "95o", "85o", "75o", "65o", "55", "54s", "53s", "52s"],
  ["A4o", "K4o", "Q4o", "J4o", "T4o", "94o", "84o", "74o", "64o", "54o", "44", "43s", "42s"],
  ["A3o", "K3o", "Q3o", "J3o", "T3o", "93o", "83o", "73o", "63o", "53o", "43o", "33", "32s"],
  ["A2o", "K2o", "Q2o", "J2o", "T2o", "92o", "82o", "72o", "62o", "52o", "42o", "32o", "22"],
];

function extractHandStrategy(result: any, hand: string): StrategyGridCell {
  const cell: StrategyGridCell = { hand };
  if (result.nodes?.[hand]) {
    const actions = result.nodes[hand];
    for (const [action, freq] of Object.entries(actions)) {
      const freqNum = typeof freq === "string" ? parseFloat(freq as string) : (freq as number);
      const pct = Math.round(freqNum * 100);
      if (action.toLowerCase().includes("check")) cell.check = pct;
      else if (action.toLowerCase().includes("bet")) cell.bet = pct;
      else if (action.toLowerCase().includes("raise")) cell.raise = pct;
      else if (action.toLowerCase().includes("fold")) cell.fold = pct;
      else if (action.toLowerCase().includes("call")) cell.call = pct;
    }
  }
  return cell;
}

export function SolverPanel() {
  const [spots, setSpots] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [selectedSpot, setSelectedSpot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load available spots
  useEffect(() => {
    fetch("/api/solver")
      .then((r) => r.json())
      .then((data) => {
        setSpots(data.spots);
        if (data.spots.length > 0) {
          setSelectedSpot(data.spots[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Load selected spot
  useEffect(() => {
    if (!selectedSpot) return;
    setResult(null);
    fetch(`/api/solver?spotId=${selectedSpot}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setResult(data);
          setError(null);
        }
      })
      .catch((err) => setError(err.message));
  }, [selectedSpot]);

  const handStrategies = result ? HAND_GRID.flat().map((hand) => extractHandStrategy(result.result, hand)) : [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Spot Selector */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">Pre-Computed GTO Spots</h3>
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading spots...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {spots.map((spot) => (
              <button
                key={spot.id}
                onClick={() => setSelectedSpot(spot.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  selectedSpot === spot.id
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div className="font-medium text-sm text-zinc-700">{spot.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{spot.description}</div>
              </button>
            ))}
          </div>
        )}

        {error && <div className="mt-2 rounded bg-red-50 p-2 text-[11px] text-red-700">{error}</div>}
      </div>

      {/* Strategy Grid */}
      {result && handStrategies.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 overflow-auto flex-1">
          <h4 className="mb-2 text-xs font-semibold text-zinc-700">Strategy Grid</h4>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(13, minmax(40px, 1fr))" }}>
            {handStrategies.map((cell) => {
              const mainAction =
                (cell.check && "Check") ||
                (cell.bet && "Bet") ||
                (cell.raise && "Raise") ||
                (cell.call && "Call") ||
                (cell.fold && "Fold") ||
                "-";
              const freq = cell.check || cell.bet || cell.raise || cell.call || cell.fold || 0;
              const color =
                freq > 80
                  ? "bg-emerald-200"
                  : freq > 50
                    ? "bg-emerald-100"
                    : freq > 0
                      ? "bg-amber-100"
                      : "bg-zinc-100";

              return (
                <div
                  key={cell.hand}
                  className={`flex flex-col items-center justify-center rounded border border-zinc-200 p-1 ${color} min-h-12 text-center`}
                >
                  <div className="font-card text-[9px] font-semibold text-zinc-700">{cell.hand}</div>
                  <div className="font-card text-[8px] text-zinc-600">{mainAction}</div>
                  {freq > 0 && <div className="font-card text-[7px] text-zinc-500">{freq}%</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
