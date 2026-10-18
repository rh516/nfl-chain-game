"use client";

import {
  createRoomInputSchema,
  joinRoomInputSchema,
} from "@nfl-chain/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createRoomRequest,
  joinRoomRequest,
} from "@/lib/rooms/room-api";

type PendingAction = "create" | "join" | null;

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

  const isPending = pendingAction !== null;

  return (
    <div className="entry-card" aria-label="Create or join a game">
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
      <button
        className="primary-button"
        type="button"
        disabled={isPending}
        onClick={() => void handleCreateRoom()}
      >
        {pendingAction === "create" ? "Creating…" : "Create game"}
      </button>

      <div className="divider"><span>or</span></div>

      <label className="field-label" htmlFor="game-code">
        Join a private game
      </label>
      <div className="join-row">
        <input
          id="game-code"
          className="text-field text-field--code"
          value={roomCode}
          placeholder="GAME CODE"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={6}
          disabled={isPending}
          onChange={(event) =>
            setRoomCode(event.target.value.toUpperCase())
          }
        />
        <button
          className="secondary-button"
          type="button"
          disabled={isPending}
          onClick={() => void handleJoinRoom()}
        >
          {pendingAction === "join" ? "Joining…" : "Join"}
        </button>
      </div>

      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
