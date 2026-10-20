"use client";

import {
  createRoomInputSchema,
  joinRoomInputSchema,
} from "@nfl-chain/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  createRoomRequest,
  joinRoomRequest,
} from "@/lib/rooms/room-api";

type EntryMode = "create" | "join";
type PendingAction = EntryMode | null;

function getValidationMessage(error: {
  issues: Array<{ message: string }>;
}) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Try again.";
}

export function GameEntryForm() {
  const router = useRouter();
  const [entryMode, setEntryMode] = useState<EntryMode>("create");
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [pendingAction, setPendingAction] =
    useState<PendingAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreateRoom() {
    const input = createRoomInputSchema.safeParse({ displayName });

    if (!input.success) {
      setErrorMessage(getValidationMessage(input.error));
      return;
    }

    setErrorMessage(null);
    setPendingAction("create");

    try {
      const result = await createRoomRequest(input.data);
      router.push(`/rooms/${result.roomCode}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPendingAction(null);
    }
  }

  async function handleJoinRoom() {
    const input = joinRoomInputSchema.safeParse({
      roomCode,
      displayName,
    });

    if (!input.success) {
      setErrorMessage(getValidationMessage(input.error));
      return;
    }

    setErrorMessage(null);
    setPendingAction("join");

    try {
      const result = await joinRoomRequest(input.data);
      router.push(`/rooms/${result.roomCode}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPendingAction(null);
    }
  }

  function selectEntryMode(mode: EntryMode) {
    setEntryMode(mode);
    setErrorMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (entryMode === "create") {
      void handleCreateRoom();
      return;
    }

    void handleJoinRoom();
  }

  const isPending = pendingAction !== null;
  const submitLabel =
    pendingAction === "create"
      ? "Creating…"
      : pendingAction === "join"
        ? "Joining…"
        : entryMode === "create"
          ? "Create private room"
          : "Join room";

  return (
    <div className="entry-card" aria-label="Create or join a game">
      <div className="entry-tabs" role="tablist" aria-label="Room action">
        <button
          id="create-room-tab"
          className={`entry-tab${entryMode === "create" ? " entry-tab--active" : ""}`}
          type="button"
          role="tab"
          aria-selected={entryMode === "create"}
          aria-controls="room-entry-panel"
          disabled={isPending}
          onClick={() => selectEntryMode("create")}
        >
          Create game
        </button>
        <button
          id="join-room-tab"
          className={`entry-tab${entryMode === "join" ? " entry-tab--active" : ""}`}
          type="button"
          role="tab"
          aria-selected={entryMode === "join"}
          aria-controls="room-entry-panel"
          disabled={isPending}
          onClick={() => selectEntryMode("join")}
        >
          Join game
        </button>
      </div>

      <form
        id="room-entry-panel"
        className="entry-form"
        role="tabpanel"
        aria-labelledby={
          entryMode === "create" ? "create-room-tab" : "join-room-tab"
        }
        onSubmit={handleSubmit}
      >
        <label className="field-label" htmlFor="display-name">
          Your display name
        </label>
        <input
          id="display-name"
          className="text-field"
          value={displayName}
          placeholder="Enter your name"
          autoComplete="nickname"
          disabled={isPending}
          onChange={(event) => setDisplayName(event.target.value)}
        />

        {entryMode === "join" && (
          <>
            <label className="field-label" htmlFor="game-code">
              Game code
            </label>
            <input
              id="game-code"
              className="text-field text-field--code"
              value={roomCode}
              placeholder="ABC123"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={6}
              disabled={isPending}
              onChange={(event) =>
                setRoomCode(event.target.value.toUpperCase())
              }
            />
          </>
        )}

        <button className="primary-button" type="submit" disabled={isPending}>
          {submitLabel}
        </button>

        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}
