"use client";

import Link from "next/link";
import { SolverPanel } from "@/components/solver/SolverPanel";

export default function SolverPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">GTO Solver</h1>
          <p className="text-xs text-muted-foreground">
            Interactive Nash equilibrium solver for poker spots
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Local development only</span>
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full max-w-4xl">
          <SolverPanel />
        </div>
      </div>
    </div>
  );
}
