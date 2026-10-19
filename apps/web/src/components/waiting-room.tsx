import type { WaitingRoom as WaitingRoomData } from "@nfl-chain/shared";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

type WaitingRoomProps = {
  roomCode: string;
  room: WaitingRoomData;
  currentUid: string;
  isStarting: boolean;
  errorMessage: string | null;
  onStart(): void;
};

export function WaitingRoom({
  roomCode,
  room,
  currentUid,
  isStarting,
  errorMessage,
  onStart,
}: WaitingRoomProps) {
  const players = Object.values(room.players).sort(
    (first, second) => first.joinOrder - second.joinOrder,
  );
  const isCreator = room.creatorUid === currentUid;

  return (
    <main className="room-shell">
      <header className="room-topbar">
        <Link href="/" className="brand-link" aria-label="NFL Chain home">
          <BrandMark />
        </Link>
        <div className="room-code-chip">
          <span>Game code</span>
          <strong>{roomCode}</strong>
        </div>
      </header>

      <section className="room-stage">
        <div className="waiting-layout">
          <section className="waiting-card">
            <div className="waiting-card__header">
              <div>
                <p className="eyebrow">Waiting room</p>
                <h1 className="waiting-title">Players</h1>
              </div>
              <span className="player-count">{players.length} / 4</span>
            </div>

            <ol className="player-list">
              {players.map((player) => (
                <li className="player-row" key={player.uid}>
                  <span className="player-avatar" aria-hidden="true">
                    {player.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="player-copy">
                    <strong>{player.displayName}</strong>
                    <small>
                      {player.uid === currentUid
                        ? "You"
                        : player.uid === room.creatorUid
                          ? "Creator"
                          : `Player ${player.joinOrder + 1}`}
                    </small>
                  </span>
                  <span className="member-badge">Joined</span>
                </li>
              ))}
            </ol>
          </section>

          <aside className="waiting-info-card">
            <span className="mini-label">Game code</span>
            <strong className="waiting-code">{roomCode}</strong>
            <p>Share this code or the current URL with up to three other players.</p>

            <div className="waiting-note">
              <span className="status-pill__dot" />
              Room updates are live
            </div>

            {isCreator ? (
              <button
                className="primary-button waiting-start-button"
                type="button"
                disabled={isStarting}
                onClick={onStart}
              >
                {isStarting ? "Starting…" : "Start game"}
              </button>
            ) : (
              <p className="waiting-footnote">
                Waiting for the creator to start the game.
              </p>
            )}

            {errorMessage && (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
