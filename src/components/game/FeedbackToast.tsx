"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { JudgeResult } from "@/lib/game/types";

const VERDICT_CONFIG = {
  optimal: {
    label: "Optimal",
    badge: "bg-[oklch(0.72_0.17_145)]/15 text-[oklch(0.72_0.17_145)] border-[oklch(0.72_0.17_145)]/30",
    bar: "bg-[oklch(0.72_0.17_145)]",
  },
  acceptable: {
    label: "Acceptable",
    badge: "bg-[oklch(0.75_0.13_88)]/15 text-[oklch(0.75_0.13_88)] border-[oklch(0.75_0.13_88)]/30",
    bar: "bg-[oklch(0.75_0.13_88)]",
  },
  mistake: {
    label: "Mistake",
    badge: "bg-[oklch(0.72_0.17_50)]/15 text-[oklch(0.72_0.17_50)] border-[oklch(0.72_0.17_50)]/30",
    bar: "bg-[oklch(0.72_0.17_50)]",
  },
  blunder: {
    label: "Blunder",
    badge: "bg-[oklch(0.62_0.22_25)]/15 text-[oklch(0.62_0.22_25)] border-[oklch(0.62_0.22_25)]/30",
    bar: "bg-[oklch(0.62_0.22_25)]",
  },
};

type FeedbackToastProps = {
  result: JudgeResult;
  onDismiss: () => void;
};

export function FeedbackToast({ result, onDismiss }: FeedbackToastProps) {
  const [expanded, setExpanded] = useState(false);
  const config = VERDICT_CONFIG[result.verdict];

  return (
    <motion.div
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-80 rounded-xl border border-border bg-card shadow-xl"
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${config.badge}`}
            >
              {config.label}
            </span>
            <span className="font-card text-xs text-muted-foreground">
              {result.rating}/100
            </span>
          </div>
          {/* Rating bar */}
          <div className="mb-2 h-1 w-full rounded-full bg-muted">
            <motion.div
              className={`h-full rounded-full ${config.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${result.rating}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="text-[13px] leading-relaxed text-foreground">
            {result.primaryReason}
          </p>
          {result.betterAction && (
            <p className="mt-1 text-[12px] text-muted-foreground">
              Better:{" "}
              <span className="font-medium text-foreground capitalize">
                {result.betterAction}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          ×
        </button>
      </div>

      {/* Expandable details */}
      {(result.secondaryConsiderations.length > 0 ||
        result.conceptTags.length > 0) && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex w-full items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Details</span>
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {result.secondaryConsiderations.length > 0 && (
                    <ul className="space-y-1.5">
                      {result.secondaryConsiderations.map((point, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-[12px] text-muted-foreground"
                        >
                          <span className="shrink-0 text-muted-foreground/40">
                            —
                          </span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.conceptTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.conceptTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-secondary px-1.5 py-0.5 font-card text-[10px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
