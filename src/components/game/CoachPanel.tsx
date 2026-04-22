"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChevronLeft, ChevronRight, SendHorizonal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { HandState } from "@/lib/game/types";
import { getHero, getVisibleBoard } from "@/lib/game/state-machine";
import { cardToString } from "@/lib/game/deck";

type CoachPanelProps = {
  state: HandState | null;
  lastVerdict?: string;
  lastAction?: string;
};

export function CoachPanel({ state, lastVerdict, lastAction }: CoachPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handContext = state
    ? (() => {
        const hero = getHero(state);
        const board = getVisibleBoard(state);
        return {
          street: state.phase,
          position: hero.position,
          heroCards: hero.holeCards?.map(cardToString).join(" ") ?? "",
          board: board.map(cardToString).join(" "),
          potSize: state.pot,
          heroStack: hero.stack,
          phase: state.phase,
          lastVerdict,
          lastAction,
        };
      })()
    : undefined;

  // Keep a ref to the latest handContext so the transport closure always
  // reads the current value without needing to recreate the transport
  // (which would reset the message history).
  const handContextRef = useRef(handContext);
  handContextRef.current = handContext;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/coach",
        // body is evaluated per-request via a getter closure
        get body() {
          return { handContext: handContextRef.current };
        },
      }),
    [] // create once; closure keeps body live via ref
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input?.value.trim() || isLoading) return;
    const text = input.value.trim();
    input.value = "";
    sendMessage({ text });
  };

  return (
    <motion.div
      animate={{ width: collapsed ? 48 : 380 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex shrink-0 flex-col border-l border-border bg-card"
      style={{ overflow: "hidden" }}
    >
      {/* Toggle rail */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-5 items-center justify-center rounded-r border border-l-0 border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        {collapsed ? (
          <ChevronLeft className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Coach
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Ask about any spot
                </p>
              </div>
              <button
                onClick={() => setMessages([])}
                className="text-muted-foreground/60 transition-colors hover:text-foreground"
                title="Clear conversation"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            >
              {messages.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[13px] text-muted-foreground">
                    Ask me anything about the current spot — ranges, pot odds, what your opponent&apos;s range looks like, anything.
                  </p>
                  <div className="mt-4 flex flex-col gap-1.5">
                    {[
                      "Why is this a 3-bet spot?",
                      "What's my pot odds here?",
                      "Should I be c-betting this board?",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          if (inputRef.current) {
                            inputRef.current.value = prompt;
                            inputRef.current.focus();
                          }
                        }}
                        className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-left text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                        isUser
                          ? "bg-secondary text-foreground"
                          : "bg-background text-foreground border border-border"
                      }`}
                    >
                      {msg.parts
                        .filter((p) => p.type === "text")
                        .map((p, i) => (
                          <span key={i}>{p.type === "text" ? p.text : ""}</span>
                        ))}
                    </div>
                  </motion.div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-xl border border-border bg-background px-3 py-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-border px-3 py-3"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask the coach…"
                className="flex-1 rounded-md bg-secondary px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-[oklch(0.72_0.17_145)] text-black transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <SendHorizonal className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
