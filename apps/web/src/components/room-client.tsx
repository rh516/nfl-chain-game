"use client";

import {
  joinRoomInputSchema,
  type Room,
} from "@nfl-chain/shared";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { EndedRoom } from "@/components/ended-room";
import { GameRoom } from "@/components/game-room";
import { WaitingRoom } from "@/components/waiting-room";
import { getOrCreateAnonymousUser } from "@/lib/auth/get-or-create-anonymous-user";
import {
  joinRoomRequest,
  startGameRequest,
} from "@/lib/rooms/room-api";
import { subscribeToRoom } from "@/lib/rooms/subscribe-to-room";

type RoomClientProps = {
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

export function RoomClient({ roomCode }: RoomClientProps) {
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [room, setRoom] = useState<Room | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
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
        unsubscribe = subscribeToRoom(roomCode, {
          onRoom(nextRoom) {
            if (!isActive) {
              return;
            }

            setRoom(nextRoom);
            setErrorMessage(null);
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
        input.error.issues[0]?.message ?? "Check the form and try again.",
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

  async function handleStartGame() {
    setErrorMessage(null);
    setIsStarting(true);

    try {
      const result = await startGameRequest({ roomCode });
      setRoom(result.room);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  }

  if (viewState === "room" && room && currentUid) {
    if (room.status === "WAITING") {
      return (
        <WaitingRoom
          roomCode={roomCode}
          room={room}
          currentUid={currentUid}
          isStarting={isStarting}
          errorMessage={errorMessage}
          onStart={() => void handleStartGame()}
        />
      );
    }

    if (room.status === "IN_PROGRESS") {
      return (
        <GameRoom
          roomCode={roomCode}
          room={room}
          currentUid={currentUid}
        />
      );
    }

    return <EndedRoom roomCode={roomCode} room={room} />;
  }

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
            <p>Choose the name other players will see in the room.</p>

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
      </section>
    </main>
  );
}
