"use client";

import { useState, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import type { ActionType, HandState, Player } from "@/lib/game/types";
import { getLegalActions, getCallAmount } from "@/lib/game/state-machine";

const SIZE_PRESETS = [
  { label: "33%", multiplier: 0.33 },
  { label: "50%", multiplier: 0.5 },
  { label: "66%", multiplier: 0.66 },
  { label: "Pot", multiplier: 1.0 },
  { label: "2x", multiplier: 2.0 },
  { label: "All-in", multiplier: -1 }, // special
];

type ActionBarProps = {
  state: HandState;
  hero: Player;
  onAction: (type: ActionType, amount: number) => void;
  disabled?: boolean;
};

export function ActionBar({ state, hero, onAction, disabled = false }: ActionBarProps) {
  const [raiseAmount, setRaiseAmount] = useState(state.minRaise);
  const legalActions = getLegalActions(state, hero);
  const callAmount = getCallAmount(state, hero);
  const canBet = legalActions.includes("bet") || legalActions.includes("raise");
  const canCall = legalActions.includes("call");
  const canCheck = legalActions.includes("check");
  const allInAmount = hero.currentBet + hero.stack;
  const maxRaise = allInAmount;
  const minRaise = state.minRaise;

  // Keep raise in bounds when state changes
  useEffect(() => {
    setRaiseAmount(Math.max(minRaise, Math.min(raiseAmount, maxRaise)));
  }, [minRaise, maxRaise, raiseAmount]);

  const handlePreset = useCallback((multiplier: number) => {
    if (multiplier === -1) {
      setRaiseAmount(allInAmount);
    } else {
      const sized = Math.round((state.pot * multiplier) / state.bigBlindSize) * state.bigBlindSize;
      setRaiseAmount(Math.max(minRaise, Math.min(sized + state.currentBet, maxRaise)));
    }
  }, [state.pot, state.bigBlindSize, state.currentBet, minRaise, maxRaise, allInAmount]);

  const handleAction = useCallback((type: ActionType) => {
    if (disabled) return;
    const amount = type === "bet" || type === "raise" ? raiseAmount
      : type === "call" ? callAmount
      : type === "allin" ? allInAmount
      : 0;
    onAction(type, amount);
  }, [disabled, raiseAmount, callAmount, allInAmount, onAction]);

  // Keyboard shortcuts: F = fold, C = call/check, R = raise, 1-6 = presets
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      switch (e.key.toLowerCase()) {
        case "f": handleAction("fold"); break;
        case "c": handleAction(canCheck ? "check" : "call"); break;
        case "r": if (canBet) handleAction(legalActions.includes("raise") ? "raise" : "bet"); break;
        default:
          const num = parseInt(e.key);
          if (num >= 1 && num <= 6) {
            handlePreset(SIZE_PRESETS[num - 1].multiplier);
          }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, canCheck, canBet, legalActions, handleAction, handlePreset]);

  const raiseBB = (raiseAmount / state.bigBlindSize).toFixed(1);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* Sizing row */}
      {canBet && (
        <div className="flex flex-col gap-2">
          {/* Presets */}
          <div className="flex gap-1.5 flex-wrap">
            {SIZE_PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset.multiplier)}
                className="rounded border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                disabled={disabled}
              >
                <span className="font-card">{preset.label}</span>
                <span className="ml-1 text-[9px] text-muted-foreground/60">
                  {i + 1}
                </span>
              </button>
            ))}
          </div>

          {/* Slider + input */}
          <div className="flex items-center gap-3">
            <Slider
              min={minRaise}
              max={maxRaise}
              step={state.bigBlindSize}
              value={[raiseAmount]}
              onValueChange={(vals) => {
                const v = Array.isArray(vals) ? vals[0] : vals;
                if (typeof v === "number") setRaiseAmount(v);
              }}
              disabled={disabled}
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={raiseBB}
                onChange={(e) => {
                  const bb = parseFloat(e.target.value);
                  if (!isNaN(bb)) {
                    setRaiseAmount(Math.max(minRaise, Math.min(bb * state.bigBlindSize, maxRaise)));
                  }
                }}
                className="font-card w-16 rounded border border-border bg-background px-2 py-1 text-right text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={disabled}
              />
              <span className="text-xs text-muted-foreground">bb</span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Fold */}
        <button
          onClick={() => handleAction("fold")}
          disabled={disabled}
          className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-30"
        >
          Fold{" "}
          <kbd className="ml-1 rounded bg-secondary px-1 font-card text-[9px] text-muted-foreground/60">
            F
          </kbd>
        </button>

        {/* Call / Check */}
        {(canCall || canCheck) && (
          <button
            onClick={() => handleAction(canCheck ? "check" : "call")}
            disabled={disabled}
            className="flex-1 rounded-md bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-30"
          >
            {canCheck ? "Check" : (
              <span>
                Call{" "}
                <span className="font-card text-muted-foreground">
                  {(callAmount / state.bigBlindSize).toFixed(1)}bb
                </span>
              </span>
            )}{" "}
            <kbd className="ml-1 rounded bg-background px-1 font-card text-[9px] text-muted-foreground/60">
              C
            </kbd>
          </button>
        )}

        {/* Bet / Raise */}
        {canBet && (
          <button
            onClick={() => handleAction(legalActions.includes("raise") ? "raise" : "bet")}
            disabled={disabled}
            className="flex-1 rounded-md bg-[oklch(0.72_0.17_145)] px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            {legalActions.includes("raise") ? "Raise" : "Bet"}{" "}
            <span className="font-card">
              {raiseBB}bb
            </span>{" "}
            <kbd className="ml-1 rounded bg-black/20 px-1 font-card text-[9px] text-black/60">
              R
            </kbd>
          </button>
        )}
      </div>
    </div>
  );
}
