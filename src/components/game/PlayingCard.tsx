"use client";

import { motion } from "framer-motion";
import type { Card } from "@/lib/game/types";

const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

// Muted red for hearts/diamonds per spec
const SUIT_COLORS: Record<string, string> = {
  s: "text-foreground",
  h: "text-[oklch(0.58_0.18_22)]",
  d: "text-[oklch(0.58_0.18_22)]",
  c: "text-foreground",
};

type CardFaceProps = {
  card: Card;
  className?: string;
};

function CardFace({ card, className = "" }: CardFaceProps) {
  const suitColor = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div
      className={`relative flex flex-col justify-between rounded-[4px] border border-border bg-card p-1 select-none ${className}`}
      style={{ aspectRatio: "2.5/3.5" }}
    >
      {/* Top-left rank + suit */}
      <div className={`flex flex-col items-start leading-none ${suitColor}`}>
        <span className="font-card text-[11px] font-semibold leading-tight">
          {card.rank}
        </span>
        <span className="font-card text-[9px] leading-tight">{symbol}</span>
      </div>

      {/* Center pip */}
      <div className={`flex items-center justify-center text-lg ${suitColor}`}>
        <span className="font-card">{symbol}</span>
      </div>

      {/* Bottom-right rank + suit (inverted) */}
      <div
        className={`flex flex-col items-end leading-none rotate-180 ${suitColor}`}
      >
        <span className="font-card text-[11px] font-semibold leading-tight">
          {card.rank}
        </span>
        <span className="font-card text-[9px] leading-tight">{symbol}</span>
      </div>
    </div>
  );
}

function CardBack({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative rounded-[4px] border border-border bg-secondary flex items-center justify-center ${className}`}
      style={{ aspectRatio: "2.5/3.5" }}
    >
      <div className="rounded-[2px] border border-muted-foreground/30 w-[80%] h-[85%] bg-muted/40" />
    </div>
  );
}

type PlayingCardProps = {
  card?: Card;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  delay?: number;
  className?: string;
};

const SIZE_CLASSES = {
  sm: "w-8",
  md: "w-12",
  lg: "w-16",
};

export function PlayingCard({
  card,
  faceDown = false,
  size = "md",
  animate = false,
  delay = 0,
  className = "",
}: PlayingCardProps) {
  const sizeClass = SIZE_CLASSES[size];

  const content =
    !faceDown && card ? (
      <CardFace card={card} className={sizeClass} />
    ) : (
      <CardBack className={sizeClass} />
    );

  if (!animate) {
    return <div className={className}>{content}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.8, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {content}
    </motion.div>
  );
}

type CardRevealProps = {
  card: Card;
  revealed: boolean;
  size?: "sm" | "md" | "lg";
  delay?: number;
};

export function CardReveal({ card, revealed, size = "md", delay = 0 }: CardRevealProps) {
  return (
    <motion.div
      animate={{ rotateY: revealed ? 0 : 180 }}
      transition={{ duration: 0.35, delay }}
      style={{ perspective: 400 }}
    >
      {revealed ? (
        <CardFace card={card} className={SIZE_CLASSES[size]} />
      ) : (
        <CardBack className={SIZE_CLASSES[size]} />
      )}
    </motion.div>
  );
}
