"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2, Play, X } from "lucide-react";

type SolverConfig = {
  pot: number;
  effectiveStack: number;
  board: string;
  rangeIP: string;
  rangeOOP: string;
  threads: number;
  accuracy: number;
  maxIterations: number;
};

type SolverResult = {
  player: number;
  actions: Record<string, string>;
  nodes?: Record<string, Record<string, number>>;
};

type StrategyGridCell = {
  hand: string;
  check?: number;
  bet?: number;
  raise?: number;
  fold?: number;
  call?: number;
};

// Parse hand string (e.g., "AKs", "T9o") into display label
function parseHand(hand: string): string {
  return hand.toUpperCase();
}

// Extract strategy frequencies for a single hand from solver result
function extractHandStrategy(result: SolverResult, hand: string): StrategyGridCell {
  const cell: StrategyGridCell = { hand };

  // Look for this hand in the result nodes
  if (result.nodes?.[hand]) {
    const actions = result.nodes[hand];
    for (const [action, freq] of Object.entries(actions)) {
      const freqNum = typeof freq === "string" ? parseFloat(freq) : freq;
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

// 13x13 hand grid (Ax, Kx, Qx, Jx, Tx, 9x, 8x, 7x, 6x, 5x, 4x, 3x, 2x)
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

export function SolverPanel() {
  const [config, setConfig] = useState<SolverConfig>({
    pot: 50,
    effectiveStack: 200,
    board: "Qs,Jh,2h",
    rangeIP: "AA,KK,QQ,JJ,TT,AK,AQ,AJ",
    rangeOOP: "QQ,JJ,TT,99,88,AQ,AJ,AT,A9",
    threads: 8,
    accuracy: 0.5,
    maxIterations: 200,
  });

  const [solving, setSolving] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<SolverResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleSolve = async () => {
    setSolving(true);
    setProgress([]);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/solver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Solver failed");
        setSolving(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.status === "solving") {
              setProgress((p) => [...p, data.progress]);
            } else if (data.status === "complete") {
              setResult(data.result);
              setProgress((p) => [...p, "✓ Solve complete"]);
            } else if (data.status === "error") {
              setError(data.error);
              setProgress((p) => [...p, `✗ Error: ${data.error}`]);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSolving(false);
    }
  };

  const handStrategies = result
    ? HAND_GRID.flat().map((hand) => extractHandStrategy(result, hand))
    : [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Config Panel */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">GTO Solver Config</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-zinc-500">Pot</label>
            <input
              type="number"
              value={config.pot}
              onChange={(e) => setConfig((c) => ({ ...c, pot: parseInt(e.target.value) }))}
              className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              disabled={solving}
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500">Stack</label>
            <input
              type="number"
              value={config.effectiveStack}
              onChange={(e) => setConfig((c) => ({ ...c, effectiveStack: parseInt(e.target.value) }))}
              className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              disabled={solving}
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-zinc-500">Board</label>
            <input
              type="text"
              value={config.board}
              onChange={(e) => setConfig((c) => ({ ...c, board: e.target.value }))}
              placeholder="Qs,Jh,2h"
              className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              disabled={solving}
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-zinc-500">IP Range</label>
            <input
              type="text"
              value={config.rangeIP}
              onChange={(e) => setConfig((c) => ({ ...c, rangeIP: e.target.value }))}
              placeholder="AA,KK,QQ,..."
              className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              disabled={solving}
            />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] text-zinc-500">OOP Range</label>
            <input
              type="text"
              value={config.rangeOOP}
              onChange={(e) => setConfig((c) => ({ ...c, rangeOOP: e.target.value }))}
              placeholder="AA,KK,QQ,..."
              className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              disabled={solving}
            />
          </div>
        </div>

        <button
          onClick={handleSolve}
          disabled={solving}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {solving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {solving ? "Solving..." : "Solve"}
        </button>

        {error && <div className="mt-2 rounded bg-red-50 p-2 text-[11px] text-red-700">{error}</div>}
      </div>

      {/* Progress Log */}
      {progress.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 max-h-32 overflow-y-auto">
          {progress.map((msg, i) => (
            <div key={i} className="font-card text-[10px] text-zinc-600 leading-snug">
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Strategy Grid */}
      {result && handStrategies.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3 overflow-auto">
          <h4 className="mb-2 text-xs font-semibold text-zinc-700">Strategy Grid (IP Preflop)</h4>
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
                  <div className="font-card text-[9px] font-semibold text-zinc-700">{parseHand(cell.hand)}</div>
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
