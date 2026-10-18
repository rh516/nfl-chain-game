import { BrandMark } from "@/components/brand-mark";
import { GameEntryForm } from "@/components/game-entry-form";

const teamSlots = Array.from({ length: 32 }, (_, index) => index + 1);

export default function HomePage() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <BrandMark />
        <span className="status-pill">
          <span className="status-pill__dot" />
          Scaffold preview
        </span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <p className="eyebrow">The football connection game</p>
          <h1 id="hero-title">Build the chain. Link every team.</h1>
          <p className="hero__lede">
            Connect all 32 NFL franchises through players, teammates, colleges,
            and jersey numbers.
          </p>

          <GameEntryForm />

          <div className="feature-row" aria-label="Game highlights">
            <span>1–4 players</span>
            <span>No accounts</span>
            <span>32 teams</span>
          </div>
        </div>

        <div className="game-frame" aria-label="Static game room preview">
          <div className="game-frame__top">
            <BrandMark compact />
            <div>
              <span className="mini-label">Game code</span>
              <strong>—— ——</strong>
            </div>
          </div>

          <div className="score-card">
            <div>
              <span className="mini-label">Teams linked</span>
              <strong className="score-card__value">0 / 32</strong>
            </div>
            <div className="progress-grid" aria-hidden="true">
              {teamSlots.map((slot) => (
                <span key={slot} />
              ))}
            </div>
          </div>

          <div className="game-layout">
            <section className="chain-panel">
              <div className="empty-chain">
                <span className="empty-chain__icon">↗</span>
                <h2>Your chain starts here</h2>
                <p>Game activity and validation results will appear in this space.</p>
              </div>
              <div className="answer-shell" aria-hidden="true">
                <span>Enter your answer…</span>
                <span className="answer-shell__button">Submit</span>
              </div>
            </section>

            <aside className="side-panel">
              <div className="side-card">
                <span className="mini-label">Current turn</span>
                <div className="player-placeholder">
                  <span className="avatar-placeholder" />
                  <span>
                    <strong>Waiting</strong>
                    <small>Game not started</small>
                  </span>
                </div>
              </div>
              <div className="side-card side-card--tall">
                <span className="mini-label">Current chain</span>
                <div className="chain-line" />
                <div className="chain-line chain-line--short" />
                <div className="chain-line" />
              </div>
            </aside>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        <span>Local MVP scaffold</span>
        <span>Next.js · Firebase Realtime Database</span>
      </footer>
    </main>
  );
}
