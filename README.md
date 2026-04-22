# Fundamentals

6-max No-Limit Hold'em decision trainer. Focused on the core profit-driving fundamentals at 100bb — not GTO approximation.

Play hands against scripted bots, get immediate feedback graded against published charts and an LLM judge, and track your progress with spaced repetition.

## Stack

- **Next.js 16** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4** + **shadcn/ui** (new-york style)
- **Prisma 5** + PostgreSQL
- **Anthropic SDK** (judge) + **Vercel AI SDK v6** (streaming coach)
- **Framer Motion** · **Recharts** · **ts-fsrs**

## Quick Start

```bash
# 1. Install
pnpm install

# 2. Configure env
cp .env.example .env.local
# Fill in DATABASE_URL and ANTHROPIC_API_KEY
# Set MOCK_LLM=true to skip API calls during dev

# 3. Push schema
pnpm db:push

# 4. Run
pnpm dev
```

Open [http://localhost:3000/trainer](http://localhost:3000/trainer) to play.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/trainer` | Main decision trainer |
| `/dashboard` | Progress and concept mastery |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | For LLM judge | Anthropic API key |
| `MOCK_LLM` | No | Set `true` to skip API calls |
| `SESSION_SECRET` | Optional | Cookie signing secret |

For Vercel deployment, route model calls through AI Gateway by using `anthropic/claude-sonnet-4.5` as the model string and setting `AI_GATEWAY_API_KEY`.

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── coach/     # Streaming chat (Vercel AI SDK)
│   │   ├── judge/     # Postflop grader (Anthropic tool use)
│   │   ├── hand/      # Persist decisions
│   │   ├── identity/  # Cookie-based session
│   │   └── dashboard/ # Stats aggregation
│   ├── trainer/       # Main game UI
│   └── dashboard/     # Progress view
├── components/game/
│   ├── PlayingCard    # SVG-based card rendering
│   ├── TableLayout    # Elliptical 6-max seat layout
│   ├── ActionBar      # Fold/call/raise with sizing
│   ├── FeedbackToast  # Non-blocking verdict display
│   └── CoachPanel     # Streaming chat sidebar
├── data/preflop/      # RFI + vs-RFI frequency charts
├── hooks/useGame.ts   # Game loop + bot orchestration
└── lib/game/
    ├── types.ts        # Core type definitions
    ├── deck.ts         # Card utilities
    ├── state-machine.ts # Hand state transitions
    ├── bots.ts         # Reg/Fish/LAG archetypes
    └── grader.ts       # Preflop chart grader
```

## Preflop Charts

Sourced from PokerCoaching.com intro charts. Each hand maps to `{ raise, call, fold }` frequencies. Graded as:

- **Optimal** (≥75% frequency) · **Acceptable** (40–74%) · **Mistake** (10–39%) · **Blunder** (<10% or 0%)

## Bots

Three pure-function archetypes:
- **Reg** — TAG, ~28% VPIP, standard sizings, folds to 3-bets correctly
- **Fish** — ~45% VPIP, loose-passive, calls very wide, rarely raises
- **LAG** — loose-aggressive, barrels frequently, light 3-bets

## Development

```bash
pnpm test          # Run unit tests (state machine + bots)
pnpm test:watch    # Watch mode
pnpm db:studio     # Prisma Studio
pnpm lint          # ESLint
```

Set `MOCK_LLM=true` in `.env.local` to develop the full UI without burning API credits. All LLM calls return canned responses.
