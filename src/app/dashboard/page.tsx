"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type DashboardData = {
  totalHands: number;
  dueCount: number;
  positionAccuracy: { position: string; accuracy: number; total: number }[];
  streetAccuracy: { street: string; accuracy: number; total: number }[];
  recentMistakes: {
    id: string;
    position: string;
    street: string;
    heroCards: string;
    boardCards: string;
    action: string;
    verdict: string;
    rating: number;
    betterAction: string | null;
    primaryReason: string | null;
    conceptTags: string[];
    createdAt: string;
  }[];
  conceptData: {
    concept: string;
    stability: number;
    difficulty: number;
    reps: number;
    due: boolean;
  }[];
};

const VERDICT_COLORS: Record<string, string> = {
  optimal: "oklch(0.72 0.17 145)",
  acceptable: "oklch(0.75 0.13 88)",
  mistake: "oklch(0.72 0.17 50)",
  blunder: "oklch(0.62 0.22 25)",
};

const VERDICT_BADGES: Record<string, string> = {
  optimal: "bg-[oklch(0.72_0.17_145)]/15 text-[oklch(0.72_0.17_145)] border-[oklch(0.72_0.17_145)]/30",
  acceptable: "bg-[oklch(0.75_0.13_88)]/15 text-[oklch(0.75_0.13_88)] border-[oklch(0.75_0.13_88)]/30",
  mistake: "bg-[oklch(0.72_0.17_50)]/15 text-[oklch(0.72_0.17_50)] border-[oklch(0.72_0.17_50)]/30",
  blunder: "bg-[oklch(0.62_0.22_25)]/15 text-[oklch(0.62_0.22_25)] border-[oklch(0.62_0.22_25)]/30",
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-card text-2xl font-semibold text-foreground">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("fundamentals_identity");
    if (stored) {
      const { userId: uid } = JSON.parse(stored);
      setUserId(uid);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/dashboard?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  const overallAccuracy =
    data && data.positionAccuracy.length > 0
      ? Math.round(
          data.positionAccuracy.reduce((sum, p) => sum + p.accuracy * p.total, 0) /
            data.positionAccuracy.reduce((sum, p) => sum + p.total, 0)
        )
      : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          Fundamentals
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/solver"
            className="rounded-md border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            GTO Solver
          </Link>
          <Link
            href="/trainer"
            className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continue Training
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Progress</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your decision-making over time
          </p>
        </div>

        {/* Stats row */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Hands" value={data?.totalHands ?? 0} />
            <StatCard
              label="Overall Accuracy"
              value={overallAccuracy !== null ? `${overallAccuracy}%` : "—"}
              sub="optimal + acceptable"
            />
            <StatCard
              label="Due for Review"
              value={data?.dueCount ?? 0}
              sub="concepts"
            />
            <StatCard
              label="Concepts Seen"
              value={data?.conceptData.length ?? 0}
            />
          </div>
        )}

        <Separator />

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Position accuracy */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 text-sm font-medium text-foreground">
              Accuracy by Position
            </h3>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : !data?.positionAccuracy.length ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No data yet — play some hands
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={data.positionAccuracy}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="position"
                    tick={{ fontSize: 11, fill: "oklch(0.60 0 0)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "oklch(0.60 0 0)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.13 0 0)",
                      border: "1px solid oklch(0.22 0 0)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(v) => [`${v ?? 0}%`, "Accuracy"]}
                  />
                  <Bar
                    dataKey="accuracy"
                    fill="oklch(0.72 0.17 145)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Street accuracy */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 text-sm font-medium text-foreground">
              Accuracy by Street
            </h3>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : !data?.streetAccuracy.length ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={data.streetAccuracy}>
                  <PolarGrid stroke="oklch(0.22 0 0)" />
                  <PolarAngleAxis
                    dataKey="street"
                    tick={{ fontSize: 11, fill: "oklch(0.60 0 0)" }}
                  />
                  <Radar
                    dataKey="accuracy"
                    stroke="oklch(0.72 0.17 145)"
                    fill="oklch(0.72 0.17 145)"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <Separator />

        {/* Concept mastery heatmap */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Concept Mastery
          </h3>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : !data?.conceptData.length ? (
            <p className="text-sm text-muted-foreground">
              Concepts appear here as you play and receive feedback.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.conceptData.map((concept) => {
                const mastery = Math.min(
                  1,
                  concept.stability / 30
                );
                const isDue = concept.due;
                return (
                  <div
                    key={concept.concept}
                    title={`${concept.reps} reps · stability ${concept.stability.toFixed(1)}${isDue ? " · due" : ""}`}
                    className={`rounded-md border px-2 py-1 font-card text-[11px] transition-colors ${
                      isDue
                        ? "border-[oklch(0.75_0.13_88)]/50 bg-[oklch(0.75_0.13_88)]/10 text-[oklch(0.75_0.13_88)]"
                        : "border-border bg-secondary text-muted-foreground"
                    }`}
                    style={{
                      opacity: 0.4 + mastery * 0.6,
                    }}
                  >
                    {concept.concept}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Recent mistakes */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-foreground">
            Recent Mistakes
          </h3>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !data?.recentMistakes.length ? (
            <p className="text-sm text-muted-foreground">
              No mistakes recorded yet — keep playing.
            </p>
          ) : (
            <div className="space-y-2">
              {data.recentMistakes.map((hand) => (
                <div
                  key={hand.id}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                            VERDICT_BADGES[hand.verdict] ?? ""
                          }`}
                        >
                          {hand.verdict}
                        </span>
                        <span className="font-card text-xs text-muted-foreground">
                          {hand.position} · {hand.street}
                        </span>
                        <span className="font-card text-xs text-foreground">
                          {hand.heroCards}
                          {hand.boardCards ? ` | ${hand.boardCards}` : ""}
                        </span>
                      </div>
                      {hand.primaryReason && (
                        <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">
                          {hand.primaryReason}
                        </p>
                      )}
                      {hand.betterAction && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Better:{" "}
                          <span className="font-medium capitalize text-foreground">
                            {hand.betterAction}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 font-card text-sm font-semibold text-muted-foreground">
                      {hand.rating}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
