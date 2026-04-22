# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server (localhost:3000)
pnpm build        # production build
pnpm test         # run jest unit tests
pnpm test:watch   # jest in watch mode
pnpm lint         # eslint

# single test file
pnpm test -- src/lib/game/__tests__/bots.test.ts

# database
pnpm db:push      # push schema changes (uses .env for DATABASE_URL)
pnpm db:generate  # regenerate Prisma client after schema edit
pnpm db:studio    # Prisma Studio GUI
```

**Environment**: copy `.env.example` → `.env.local` (Next.js) and `.env` (Prisma, reads from there only). Set `MOCK_LLM=true` to bypass all Anthropic API calls with canned responses. The local Postgres runs on port **5433** (not 5432).

**Node constraint**: Node 23 is incompatible with Prisma 7 — the project uses Prisma 5.

## Architecture

### Game engine (`src/lib/game/`)

Pure TypeScript, no React, fully unit-tested. This is the core of the app.

- **`types.ts`** — all shared types. `HandState` is the single source of truth for a hand in progress; `Player`, `StreetAction`, `HandHistoryEntry`, `JudgeResult` all live here.
- **`state-machine.ts`** — `createNewHand()` and `applyAction()`. Immutable: every action returns a new `HandState`. `POSITIONS_6MAX` is ordered clockwise (`["SB","BB","LJ","HJ","CO","BTN"]`) so that incrementing the active-player index always gives correct action order (preflop: LJ→HJ→CO→BTN→SB→BB; postflop: SB→BB→LJ→HJ→CO→BTN).
- **`bots.ts`** — three pure-function archetypes: `regDecide`, `fishDecide`, `lagDecide`. Each takes a `BotInput` struct and returns `PlayerAction`. Hand-strength scoring is a simple heuristic (not equity), intentionally readable.
- **`grader.ts`** — `gradeDecision()` returns a `JudgeResult` for preflop decisions by chart lookup, or `null` postflop (signals the LLM judge should be called instead).
- **`deck.ts`** — `buildDeck`, `shuffle`, `handToKey` (converts two `Card`s to a chart key like `"AKs"` or `"T9o"`).

### Preflop chart data (`src/data/preflop/`)

`rfi.ts` and `vs_rfi.ts` export frequency tables keyed by hand string (e.g. `"AKs"`, `"T9o"`). Each entry is `{ raise, call, fold }` summing to 1.0. The grader uses `handToKey()` to look up the hero's holding.

### React game loop (`src/hooks/useGame.ts`)

The single hook that ties everything together. Key design decisions:
- Bot turns are driven by a `useEffect` that watches `state.hand` — **not** `state.isThinking` — to avoid the effect cancelling its own timer. A `isBotThinkingRef` guards re-entry.
- Hero actions call `gradeDecision()` synchronously for preflop, then `/api/judge` (LLM) for postflop.
- Identity (userId + sessionId) is persisted in `localStorage` and cookie; no auth required.

### API routes (`src/app/api/`)

- **`/api/judge`** — POST. Takes full hand state + hero action, returns `JudgeResult` JSON via Anthropic tool use (`tool_choice: { type: "tool", name: "judge_verdict" }`). Includes 5 few-shot examples in the system prompt. Uses direct `@anthropic-ai/sdk`.
- **`/api/coach`** — POST streaming. Uses Vercel AI SDK v6 `streamText` + `toUIMessageStreamResponse()`. The transport `body` is a getter backed by a ref in `CoachPanel` so `handContext` stays current without recreating the transport (which would reset message history).
- **`/api/hand`** — POST to persist a decision; GET to fetch history.
- **`/api/identity`** — POST, creates User + Session rows, sets cookies.
- **`/api/dashboard`** — GET aggregates accuracy by position/street, concept mastery heatmap data.

### UI components (`src/components/game/`)

- **`TableLayout.tsx`** — seats rotate so hero is always at visual position 0 (bottom). `CCW_ORDER` maps actual positions to visual indices via `(posIdx - heroIdx + 6) % 6`. Bet chips are absolutely positioned on the table felt using a separate `BET_POSITIONS` array — they are **not** part of the seat's flex column.
- **`CoachPanel.tsx`** — streaming chat using `useChat` from `@ai-sdk/react` with `DefaultChatTransport`. Transport is created once (`useMemo([], [])`); current `handContext` is read via `handContextRef.current` getter.
- **`HandHistory.tsx`** — reads `state.handHistory` (completed streets) + `state.streetActions` (current). Rendered in `trainer/page.tsx` as an absolute overlay at `top-3 left-3`, outside the table component.
- **`FeedbackToast.tsx`** — verdict badge + expandable details. Positioned at `bottom-28 right-4`.

### Persistence (`src/lib/fsrs.ts`, `prisma/schema.prisma`)

Each hero decision runs `updateConceptMastery()` which schedules FSRS reviews for the `conceptTags` returned by the judge. `ts-fsrs` v5 uses `Grade` (not `Rating`) for the `f.next()` call. The `Hand` model records one row per hero action (not per hand).

## Key invariants to preserve

- `POSITIONS_6MAX` order in `state-machine.ts` must stay `["SB","BB","LJ","HJ","CO","BTN"]` — changing it breaks both action order and postflop first-to-act logic.
- `applyAction` is pure and synchronous. Never add side effects to it.
- `gradeDecision` returns `null` for postflop — callers must handle this and fall back to the LLM judge.
- AI SDK v6: `toDataStreamResponse()` is gone; use `toUIMessageStreamResponse()`. `useChat` transport is `DefaultChatTransport`, not an `api` string.
