"use client";

import {
  NFL_TEAM_COUNT,
  moveSubmissionSchema,
  relationshipSourceSchema,
  type InProgressRoom,
  type RelationshipSource,
} from "@nfl-chain/shared";
import Link from "next/link";
import { useState } from "react";

import { BrandMark } from "@/components/brand-mark";
import { GameChain } from "@/components/game-chain";
import { TeamProgressGrid } from "@/components/team-progress-grid";
import {
  giveUpRequest,
  RoomApiError,
  submitMoveRequest,
} from "@/lib/rooms/room-api";

type GameRoomProps = {
  roomCode: string;
  room: InProgressRoom;
  currentUid: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Try again.";
}

function getErrorSources(error: unknown): RelationshipSource[] | undefined {
  if (
    !(error instanceof RoomApiError) ||
    typeof error.details !== "object" ||
    error.details === null ||
    !("sources" in error.details)
  ) {
    return undefined;
  }

  const result = relationshipSourceSchema
    .array()
    .safeParse(error.details.sources);

  return result.success ? result.data : undefined;
}

export function GameRoom({
  roomCode,
  room,
  currentUid,
}: GameRoomProps) {
  const [entityName, setEntityName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGivingUp, setIsGivingUp] = useState(false);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
    sources?: RelationshipSource[];
  } | null>(null);

  const currentEntity = room.chain.at(-1);
  const mustChoosePlayer = currentEntity && currentEntity.type !== "PLAYER";
  const currentPlayer = room.players[room.currentTurn];
  const isMyTurn = room.currentTurn === currentUid;
  const usedTeamCount = Object.keys(room.usedTeams).length;
  const playerCount = room.chain.filter((entry) => entry.type === "PLAYER").length;
  const collegeCount = room.chain.filter((entry) => entry.type === "COLLEGE").length;
  const numberCount = room.chain.filter(
    (entry) => entry.type === "JERSEY_NUMBER",
  ).length;

  const prompt = !currentEntity
    ? "Start the chain"
    : mustChoosePlayer
      ? `Connect a player to ${currentEntity.name}`
      : `What connects to ${currentEntity.name}?`;

  async function handleSubmitMove() {
    const input = moveSubmissionSchema.safeParse({
      answer: entityName,
    });

    if (!input.success) {
      setFeedback({
        tone: "error",
        message:
          input.error.issues[0]?.message ?? "Check the move and try again.",
      });
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const result = await submitMoveRequest({
        roomCode,
        submission: input.data,
      });
      setEntityName("");
      setFeedback({
        tone: "success",
        message: `${result.entry.name} was added to the chain.`,
      });
    } catch (error) {
      const sources = getErrorSources(error);

      setFeedback({
        tone: "error",
        message: getErrorMessage(error),
        ...(sources ? { sources } : {}),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGiveUp() {
    if (!confirmGiveUp) {
      setConfirmGiveUp(true);
      return;
    }

    setIsGivingUp(true);
    setFeedback(null);

    try {
      await giveUpRequest({ roomCode });
    } catch (error) {
      setFeedback({ tone: "error", message: getErrorMessage(error) });
      setConfirmGiveUp(false);
      setIsGivingUp(false);
    }
  }

  return (
    <main className="play-shell">
      <header className="play-topbar">
        <Link href="/" className="brand-link" aria-label="NFL Chain home">
          <BrandMark />
        </Link>
        <div className="play-topbar__actions">
          <div className="room-code-chip">
            <span>Game code</span>
            <strong>{roomCode}</strong>
          </div>
          <button
            className={confirmGiveUp ? "danger-button danger-button--confirm" : "danger-button"}
            type="button"
            disabled={isGivingUp}
            onClick={() => void handleGiveUp()}
          >
            {isGivingUp
              ? "Ending…"
              : confirmGiveUp
                ? "Confirm give up"
                : "Give up"}
          </button>
        </div>
      </header>

      <section className="play-hero">
        <p className="eyebrow">NFL multiplayer chain</p>
        <h1>Complete the chain</h1>
        <p>
          Link all 32 NFL franchises without repeating an entity.
        </p>
      </section>

      <section className="game-stats" aria-label="Game progress">
        <div><strong>{usedTeamCount}</strong><span>Teams</span></div>
        <div><strong>{playerCount}</strong><span>Players</span></div>
        <div><strong>{collegeCount}</strong><span>Colleges</span></div>
        <div><strong>{numberCount}</strong><span>Numbers</span></div>
        <div><strong>{NFL_TEAM_COUNT - usedTeamCount}</strong><span>Left</span></div>
      </section>

      <section className="team-board">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Franchise board</p>
            <h2>{usedTeamCount} of {NFL_TEAM_COUNT} linked</h2>
          </div>
          <span className="ai-validator-badge">AI-verified moves</span>
        </div>
        <TeamProgressGrid usedTeams={room.usedTeams} />
      </section>

      <div className="play-layout">
        <section className="move-column">
          <div className="move-card">
            <div className="move-card__step">
              Move {room.chain.length + 1}
            </div>
            <h2>{prompt}</h2>
            <p>
              {isMyTurn
                ? mustChoosePlayer
                  ? "Enter an NFL or college player who connects to the current entity."
                  : "Enter a player, NFL team, college, or jersey number."
                : `${currentPlayer?.displayName ?? "Another player"} is choosing the next link.`}
            </p>

            <form
              className="move-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmitMove();
              }}
            >
              <input
                className="move-input"
                value={entityName}
                placeholder={mustChoosePlayer ? "Enter a player…" : "Enter your answer…"}
                disabled={!isMyTurn || isSubmitting}
                onChange={(event) => setEntityName(event.target.value)}
              />
              <button
                className="confirm-move-button"
                type="submit"
                disabled={!isMyTurn || isSubmitting}
              >
                {isSubmitting ? "Checking…" : "Confirm →"}
              </button>
            </form>

            {feedback && (
              <p
                className={`move-feedback move-feedback--${feedback.tone}`}
                role="status"
              >
                {feedback.message}
                {feedback.sources && feedback.sources.length > 0 && (
                  <span className="move-feedback__sources">
                    Sources:
                    {feedback.sources.map((source, index) => (
                      <a
                        href={source.url}
                        key={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {index + 1}
                      </a>
                    ))}
                  </span>
                )}
              </p>
            )}
          </div>

          <section className="chain-board">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">Chain</p>
                <h2>{room.chain.length} links</h2>
              </div>
            </div>
            <GameChain chain={room.chain} players={room.players} />
          </section>
        </section>

        <aside className="game-sidebar">
          <section className="turn-card">
            <span className="mini-label">Current turn</span>
            <div className="turn-player">
              <span className="player-avatar" aria-hidden="true">
                {currentPlayer?.displayName.charAt(0).toUpperCase() ?? "?"}
              </span>
              <span>
                <strong>{currentPlayer?.displayName ?? "Unknown"}</strong>
                <small>{isMyTurn ? "Your turn" : "Choosing a move"}</small>
              </span>
            </div>
          </section>

          <section className="game-players-card">
            <span className="mini-label">Players</span>
            <ol>
              {Object.values(room.players)
                .sort((first, second) => first.joinOrder - second.joinOrder)
                .map((player) => (
                  <li
                    className={player.uid === room.currentTurn ? "is-current" : ""}
                    key={player.uid}
                  >
                    <span>{player.joinOrder + 1}</span>
                    <strong>{player.displayName}</strong>
                    {player.uid === currentUid && <small>You</small>}
                  </li>
                ))}
            </ol>
          </section>

          <section className="rules-card">
            <span className="mini-label">AI judge</span>
            <p>
              Entity types and factual football relationships are verified before the
              server adds a move to the chain.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
