"use client";

import {
  joinRoomInputSchema,
  type WaitingRoom,
} from "@nfl-chain/shared";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { getOrCreateAnonymousUser } from "@/lib/auth/get-or-create-anonymous-user";
import { joinRoomRequest } from "@/lib/rooms/room-api";
import { subscribeToWaitingRoom } from "@/lib/rooms/subscribe-to-waiting-room";

type WaitingRoomClientProps = {
  roomCode: string;
};

type ViewState = "loading" | "join" | "room" | "error";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Try again.";
}

function isPermissionDenied(error: Error) {
  const code = "code" in error ? error.code : undefined;
  const message = error.message.toLowerCase();

  return (
    code === "PERMISSION_DENIED" ||
    code === "permission-denied" ||
    message.includes("permission denied")
  );
}

export function WaitingRoomClient({
  roomCode,
}: WaitingRoomClientProps) {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [room, setRoom] = useState<WaitingRoom | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [subscriptionVersion, setSubscriptionVersion] = useState(0);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    void getOrCreateAnonymousUser()
      .then((user) => {
        if (!isActive) {
          return;
        }

        setCurrentUid(user.uid);
        unsubscribe = subscribeToWaitingRoom(roomCode, {
          onRoom(nextRoom) {
            if (!isActive) {
              return;
            }

            setRoom(nextRoom);
            setViewState("room");
          },
          onError(error) {
            if (!isActive) {
              return;
            }

            if (isPermissionDenied(error)) {
              setViewState("join");
              return;
            }

            setErrorMessage(error.message);
            setViewState("error");
          },
        });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
        setViewState("error");
      });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [roomCode, subscriptionVersion]);

  async function handleJoinRoom() {
    const input = joinRoomInputSchema.safeParse({
      roomCode,
      displayName,
    });

    if (!input.success) {
      setErrorMessage(
        input.error.issues[0]?.message ??
          "Check the form and try again.",
      );
      return;
    }

    setErrorMessage(null);
    setIsJoining(true);

    try {
      const result = await joinRoomRequest(input.data);
      setRoom(result.room);
      setViewState("room");
      setSubscriptionVersion((version) => version + 1);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsJoining(false);
    }
  }

  const players = room
    ? Object.values(room.players).sort(
        (first, second) => first.joinOrder - second.joinOrder,
      )
    : [];

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
        {viewState === "loading" && (
          <div className="room-message-card" aria-live="polite">
            <span className="room-spinner" aria-hidden="true" />
            <h1 className="room-message-title">Opening room</h1>
            <p>Restoring your player identity and connecting to the game.</p>
          </div>
        )}

        {viewState === "join" && (
          <div className="room-message-card room-message-card--form">
            <p className="eyebrow">Private game</p>
            <h1 className="room-message-title">Join {roomCode}</h1>
            <p>Choose the name other players will see in the waiting room.</p>

            <label className="field-label" htmlFor="invite-display-name">
              Your display name
            </label>
            <input
              id="invite-display-name"
              className="text-field"
              value={displayName}
              placeholder="Enter your name"
              autoComplete="nickname"
              disabled={isJoining}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <button
              className="primary-button"
              type="button"
              disabled={isJoining}
              onClick={() => void handleJoinRoom()}
            >
              {isJoining ? "Joining…" : "Join game"}
            </button>

            {errorMessage && (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        {viewState === "error" && (
          <div className="room-message-card">
            <p className="eyebrow eyebrow--error">Could not open room</p>
            <h1 className="room-message-title">Connection failed</h1>
            <p>{errorMessage}</p>
            <Link className="secondary-link" href="/">
              Return home
            </Link>
          </div>
        )}

        {viewState === "room" && room && (
          <div className="waiting-layout">
            <section className="waiting-card">
              <div className="waiting-card__header">
                <div>
                  <p className="eyebrow">Waiting room</p>
                  <h1 className="waiting-title">Players</h1>
                </div>
                <span className="player-count">
                  {players.length} / 4
                </span>
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

              <p className="waiting-footnote">
                Starting the game and player readiness will be added in the next
                gameplay section.
              </p>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
