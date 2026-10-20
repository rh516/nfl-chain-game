import { BrandMark } from "@/components/brand-mark";
import { GameEntryForm } from "@/components/game-entry-form";

export default function HomePage() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <BrandMark />
      </header>

      <section className="home-stage" aria-labelledby="home-title">
        <div className="home-hero">
          <p className="eyebrow">The football connection game</p>
          <h1 id="home-title" className="home-title">
            NFL Chain
          </h1>
          <p className="home-lede">
            Build one continuous chain through players, teams, colleges, and
            jersey numbers. Link all 32 NFL franchises to win.
          </p>

          <GameEntryForm />
        </div>
      </section>
    </main>
  );
}
