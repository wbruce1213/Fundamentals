import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDueConceptCount } from "@/lib/fsrs";
import { z } from "zod";

const QuerySchema = z.object({
  userId: z.string(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { userId } = QuerySchema.parse({ userId: searchParams.get("userId") });

    const [totalHands, hands, conceptMasteries, dueCount] = await Promise.all([
      prisma.hand.count({ where: { userId } }),
      prisma.hand.findMany({
        where: { userId },
        select: {
          id: true,
          position: true,
          street: true,
          heroCards: true,
          boardCards: true,
          action: true,
          verdict: true,
          rating: true,
          betterAction: true,
          primaryReason: true,
          conceptTags: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.conceptMastery.findMany({
        where: { userId },
        orderBy: { dueDate: "asc" },
      }),
      getDueConceptCount(userId),
    ]);

    // Accuracy by position
    const byPosition: Record<string, { total: number; good: number }> = {};
    const byStreet: Record<string, { total: number; good: number }> = {};
    type HandRow = (typeof hands)[number];
    const mistakes = hands.filter(
      (h: HandRow) => h.verdict === "mistake" || h.verdict === "blunder"
    );

    for (const hand of hands as HandRow[]) {
      if (!hand.verdict) continue;
      const isGood = hand.verdict === "optimal" || hand.verdict === "acceptable";

      if (!byPosition[hand.position]) byPosition[hand.position] = { total: 0, good: 0 };
      byPosition[hand.position].total++;
      if (isGood) byPosition[hand.position].good++;

      if (!byStreet[hand.street]) byStreet[hand.street] = { total: 0, good: 0 };
      byStreet[hand.street].total++;
      if (isGood) byStreet[hand.street].good++;
    }

    const positionAccuracy = Object.entries(byPosition).map(([pos, data]) => ({
      position: pos,
      accuracy: Math.round((data.good / data.total) * 100),
      total: data.total,
    }));

    const streetAccuracy = Object.entries(byStreet).map(([street, data]) => ({
      street,
      accuracy: Math.round((data.good / data.total) * 100),
      total: data.total,
    }));

    // Concept mastery for heatmap
    type CMRow = (typeof conceptMasteries)[number];
    const conceptData = conceptMasteries.map((cm: CMRow) => ({
      concept: cm.concept,
      stability: cm.stability,
      difficulty: cm.difficulty,
      reps: cm.reps,
      due: cm.dueDate <= new Date(),
    }));

    return NextResponse.json({
      totalHands,
      dueCount,
      positionAccuracy,
      streetAccuracy,
      recentMistakes: mistakes.slice(0, 10),
      conceptData,
      recentHands: hands.slice(0, 20),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
