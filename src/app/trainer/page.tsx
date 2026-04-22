"use client";

import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { TableLayout } from "@/components/game/TableLayout";
import { ActionBar } from "@/components/game/ActionBar";
import { FeedbackToast } from "@/components/game/FeedbackToast";
import { CoachPanel } from "@/components/game/CoachPanel";
import { useGame } from "@/hooks/useGame";
import { getHero } from "@/lib/game/state-machine";

export default function TrainerPage() {
  const {
    hand,
    verdict,
    isThinking,
    isGrading,
    dealNewHand,
    heroAct,
    dismissVerdict,
  } = useGame();

  // Auto-deal on mount
  useEffect(() => {
    dealNewHand();
  }, [dealNewHand]);

  const hero = hand ? getHero(hand) : null;
  const isComplete =
    hand?.phase === "complete" || hand?.phase === "showdown";
  const awaitingHero = hand?.awaitingHeroAction ?? false;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Main trainer area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Fundamentals
          </Link>
          <div className="flex items-center gap-4">
            {hand && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-card">
                  {hand.phase.toUpperCase()}
                </span>
                <span>·</span>
                <span>
                  {hero?.position} · {(hero?.stack ?? 0) / hand.bigBlindSize}bb
                </span>
              </div>
            )}
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {/* Table */}
        <div className="relative flex-1 overflow-hidden">
          {!hand ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex-1 p-4">
                <TableLayout state={hand} />
              </div>

              {/* Action bar or status */}
              <div className="px-6 pb-6">
                {isComplete ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {hand.winner === "hero"
                        ? "You win the pot."
                        : hand.phase === "showdown"
                        ? "Showdown"
                        : "Hand complete."}
                    </div>
                    <button
                      onClick={dealNewHand}
                      className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Deal Next Hand
                    </button>
                  </div>
                ) : !awaitingHero ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    {isThinking && (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>
                          {hand.players[hand.activePlayerIndex]?.name} is thinking…
                        </span>
                      </>
                    )}
                  </div>
                ) : isGrading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Grading decision…</span>
                  </div>
                ) : (
                  <ActionBar
                    state={hand}
                    hero={hero!}
                    onAction={heroAct}
                    disabled={!awaitingHero || isGrading}
                  />
                )}
              </div>
            </div>
          )}

          {/* Feedback toast overlay */}
          <div className="absolute bottom-32 right-4 z-20">
            <AnimatePresence>
              {verdict && (
                <FeedbackToast
                  key="feedback"
                  result={verdict}
                  onDismiss={dismissVerdict}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Coach panel */}
      <CoachPanel
        state={hand}
        lastVerdict={verdict?.verdict}
        lastAction={verdict?.betterAction}
      />
    </div>
  );
}
