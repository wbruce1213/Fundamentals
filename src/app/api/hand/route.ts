import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { updateConceptMastery } from "@/lib/fsrs";
import { cookies } from "next/headers";

const HandSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  position: z.string(),
  heroCards: z.string(),
  boardCards: z.string().default(""),
  street: z.string(),
  potSize: z.number().int(),
  heroStack: z.number().int(),
  villainStack: z.number().int().default(10000),
  action: z.string(),
  sizingBB: z.number().optional(),
  verdict: z.string().optional(),
  rating: z.number().int().optional(),
  betterAction: z.string().optional(),
  primaryReason: z.string().optional(),
  secondaryConsiderations: z.array(z.string()).default([]),
  conceptTags: z.array(z.string()).default([]),
  opponents: z.string().default("[]"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = HandSchema.parse(body);

    const hand = await prisma.hand.create({ data });

    if (data.verdict && data.conceptTags.length > 0) {
      await updateConceptMastery(data.userId, data.conceptTags, data.verdict);
    }

    return NextResponse.json({ id: hand.id });
  } catch (err) {
    console.error("[POST /api/hand]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const hands = await prisma.hand.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(hands);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
