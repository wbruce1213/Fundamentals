import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const HandContextSchema = z
  .object({
    street: z.string(),
    position: z.string(),
    heroCards: z.string(),
    board: z.string(),
    potSize: z.number(),
    heroStack: z.number(),
    phase: z.string(),
    lastVerdict: z.string().optional(),
    lastAction: z.string().optional(),
  })
  .optional();

const COACH_SYSTEM = `You are a poker coach for 6-max No-Limit Hold'em cash games at 100 big blinds. Your student is working through hands and wants to understand the fundamentals: ranges, equity, pot odds, board texture, range/nut advantage, and SPR.

Coaching principles:
- Teach concepts, not solver outputs. Never cite specific GTO frequencies as if they are fixed laws.
- Reference the current hand when relevant — the student doesn't need to re-explain the spot.
- Ask questions that build intuition (e.g., "What range does your opponent check-call here?").
- Be direct but encouraging. Point out leaks without being dismissive.
- Keep responses concise — 2-5 sentences for quick questions, longer for concept breakdowns.
- Use poker terminology naturally but explain jargon when it first appears.

Forbidden:
- Inventing exact GTO frequencies ("you should raise 43% here")
- Mentioning solvers or CFR
- Making up hand histories`;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // AI SDK v6 sends UIMessage[] (with parts arrays), not { role, content: string }[].
    // Validate only handContext with Zod; pass messages through convertToModelMessages.
    const messages = body.messages as UIMessage[];
    const handContext = HandContextSchema.parse(body.handContext);

    const systemWithContext = handContext
      ? `${COACH_SYSTEM}

Current hand context (do not repeat unless relevant):
- Street: ${handContext.street}
- Hero position: ${handContext.position}
- Hero cards: ${handContext.heroCards}
- Board: ${handContext.board || "none yet"}
- Pot: ${handContext.potSize} chips
- Hero stack: ${handContext.heroStack} chips${handContext.lastAction ? `\n- Hero's last action: ${handContext.lastAction}` : ""}${handContext.lastVerdict ? `\n- Last decision verdict: ${handContext.lastVerdict}` : ""}`
      : COACH_SYSTEM;

    // @ai-sdk/anthropic reads ANTHROPIC_API_KEY from env automatically.
    const anthropic = createAnthropic();

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemWithContext,
      messages: modelMessages,
      maxOutputTokens: 600,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[/api/coach]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
