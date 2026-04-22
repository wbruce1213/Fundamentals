import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { z } from "zod";

export const maxDuration = 60;

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  handContext: z
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
    .optional(),
});

const COACH_SYSTEM = `You are a poker coach for 6-max No-Limit Hold'em cash games at 100 big blinds. Your student is working through hands and wants to understand the fundamentals: ranges, equity, pot odds, board texture, range/nut advantage, and SPR.

Coaching principles:
- Teach concepts, not solver outputs. Never cite specific GTO frequencies as if they are fixed laws.
- Reference the current hand when relevant — the student doesn't need to re-explain the spot.
- Ask questions that build intuition (e.g., "What range does your opponent check-call here?").
- Be direct but encouraging. Point out leaks without being dismissive.
- Keep responses concise — 2-5 sentences for quick questions, longer for concept breakdowns.
- Use poker terminology naturally but explain jargon when it first appears.
- Never tell the student what their exact equity is unless they explicitly ask and you can approximate it.

Forbidden:
- Inventing exact GTO frequencies ("you should raise 43% here")
- Mentioning solvers or CFR
- Making up hand histories
- Discouraging questions`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, handContext } = RequestSchema.parse(body);

    const systemWithContext = handContext
      ? `${COACH_SYSTEM}

Current hand context (do not repeat unless relevant):
- Street: ${handContext.street}
- Hero position: ${handContext.position}
- Hero cards: ${handContext.heroCards}
- Board: ${handContext.board || "none yet"}
- Pot: ${handContext.potSize} chips
- Hero stack: ${handContext.heroStack} chips
- Phase: ${handContext.phase}${handContext.lastAction ? `\n- Hero's last action: ${handContext.lastAction}` : ""}${handContext.lastVerdict ? `\n- Last decision verdict: ${handContext.lastVerdict}` : ""}`
      : COACH_SYSTEM;

    if (process.env.MOCK_LLM === "true") {
      const mockResponses = [
        "Great question. On this board texture, your range advantage is significant because your opening range connects with high cards much better than the BB's defending range.",
        "Think about what hands check-call here vs check-fold. If you can identify that, you'll know exactly how to size your bets for maximum value.",
        "The key concept here is SPR. With ~4:1 SPR, you're committed with top pair top kicker — your decision should have been made preflop, not on the flop.",
        "Your read on the archetype matters here. A Fish calls very wide regardless of board texture, so value bet sizing should go bigger.",
      ];
      const mock = mockResponses[Math.floor(Math.random() * mockResponses.length)];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const words = mock.split(" ");
          for (const word of words) {
            controller.enqueue(encoder.encode(`0:"${word} "\n`));
            await new Promise((r) => setTimeout(r, 30));
          }
          controller.enqueue(encoder.encode(`d:{"finishReason":"stop"}\n`));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    // @ai-sdk/anthropic reads ANTHROPIC_API_KEY from env automatically.
    // For Vercel deployment: set AI_GATEWAY_API_KEY and use model 'anthropic/claude-sonnet-4.5'
    const anthropic = createAnthropic();

    const result = streamText({
      model: anthropic("claude-sonnet-4.5"),
      system: systemWithContext,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
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
