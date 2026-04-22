import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Fundamentals
        </h1>
        <p className="mt-2 text-muted-foreground">
          6-max NLHE decision trainer
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/trainer"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Start Training
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
