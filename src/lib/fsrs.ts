import { createEmptyCard, fsrs, generatorParameters, Rating } from "ts-fsrs";
import type { Card as FSRSCard, Grade } from "ts-fsrs";
import { prisma } from "./prisma";

const params = generatorParameters({ enable_fuzz: true });
const f = fsrs(params);

export type ReviewRating = "again" | "hard" | "good" | "easy";

function toFSRSGrade(rating: ReviewRating): Grade {
  const map: Record<ReviewRating, Grade> = {
    again: Rating.Again as Grade,
    hard: Rating.Hard as Grade,
    good: Rating.Good as Grade,
    easy: Rating.Easy as Grade,
  };
  return map[rating];
}

function verdictToRating(verdict: string): ReviewRating {
  switch (verdict) {
    case "optimal": return "easy";
    case "acceptable": return "good";
    case "mistake": return "hard";
    case "blunder": return "again";
    default: return "good";
  }
}

export async function updateConceptMastery(
  userId: string,
  conceptTags: string[],
  verdict: string
): Promise<void> {
  const grade = toFSRSGrade(verdictToRating(verdict));

  await Promise.all(
    conceptTags.map(async (concept) => {
      const existing = await prisma.conceptMastery.findUnique({
        where: { userId_concept: { userId, concept } },
      });

      const card: FSRSCard = existing
        ? {
            due: existing.dueDate,
            stability: existing.stability,
            difficulty: existing.difficulty,
            elapsed_days: existing.elapsedDays,
            scheduled_days: existing.scheduledDays,
            reps: existing.reps,
            lapses: existing.lapses,
            state: existing.state as FSRSCard["state"],
            last_review: existing.lastReview ?? undefined,
            learning_steps: 0,
          }
        : createEmptyCard();

      const now = new Date();
      const result = f.next(card, now, grade);
      const next = result.card;

      await prisma.conceptMastery.upsert({
        where: { userId_concept: { userId, concept } },
        create: {
          userId,
          concept,
          stability: next.stability,
          difficulty: next.difficulty,
          elapsedDays: next.elapsed_days,
          scheduledDays: next.scheduled_days,
          reps: next.reps,
          lapses: next.lapses,
          state: next.state,
          lastReview: now,
          dueDate: next.due,
        },
        update: {
          stability: next.stability,
          difficulty: next.difficulty,
          elapsedDays: next.elapsed_days,
          scheduledDays: next.scheduled_days,
          reps: next.reps,
          lapses: next.lapses,
          state: next.state,
          lastReview: now,
          dueDate: next.due,
        },
      });
    })
  );
}

export async function getDueConcepts(userId: string): Promise<string[]> {
  const due = await prisma.conceptMastery.findMany({
    where: {
      userId,
      dueDate: { lte: new Date() },
    },
    select: { concept: true },
  });
  return due.map((d: { concept: string }) => d.concept);
}

export async function getDueConceptCount(userId: string): Promise<number> {
  return prisma.conceptMastery.count({
    where: {
      userId,
      dueDate: { lte: new Date() },
    },
  });
}
