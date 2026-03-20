import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center items-center text-center flex-1 gap-6 px-4">
      <h1 className="text-4xl font-bold tracking-tight">FundFight Docs</h1>
      <p className="text-fd-muted-foreground text-lg max-w-xl">
        Technical documentation for the FundFight gamified investment education platform —
        simulation engine, scoring, AI coach, PvP battle mode, and API reference.
      </p>
      <div className="flex gap-3">
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground hover:bg-fd-primary/90 transition-colors"
        >
          Read the docs →
        </Link>
        <Link
          href="https://starthack-game.vercel.app"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-md border border-fd-border px-4 py-2 text-sm font-medium hover:bg-fd-accent transition-colors"
        >
          Play the game
        </Link>
      </div>
    </div>
  );
}
