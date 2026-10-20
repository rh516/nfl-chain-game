import "server-only";

import { randomUUID } from "node:crypto";

import {
  NFL_TEAM_COUNT,
  inProgressRoomSchema,
  isAllowedTransition,
  roomSchema,
  type ChainEntry,
  type EndedRoom,
  type InProgressRoom,
  type NormalizedEntity,
  type SubmitMoveInput,
  type SubmitMoveResult,
} from "@nfl-chain/shared";

import { adminRealtimeDatabase } from "@/lib/firebase/admin";
import { GameActionError } from "@/lib/game/game-action-error";
import {
  AiValidatorUnavailableError,
  validateMove,
} from "@/lib/game/ai-validator";

type SubmitMoveParams = SubmitMoveInput & {
  uid: string;
};

function parseActiveRoom(value: unknown): InProgressRoom {
  if (value === null) {
    throw new GameActionError(
      "ROOM_NOT_FOUND",
      "That room does not exist.",
    );
  }

  const room = roomSchema.safeParse(value);

  if (!room.success) {
    throw new Error("Stored room failed validation.");
  }

  if (room.data.status !== "IN_PROGRESS") {
    throw new GameActionError(
      "ROOM_NOT_IN_PROGRESS",
      "That game is not currently in progress.",
    );
  }

  return room.data;
}

function assertCanSubmit(
  room: InProgressRoom,
  uid: string,
  entity?: NormalizedEntity,
): void {
  if (!(uid in room.players)) {
    throw new GameActionError(
      "NOT_A_MEMBER",
      "You are not a member of that room.",
    );
  }

  if (room.currentTurn !== uid) {
    throw new GameActionError(
      "NOT_YOUR_TURN",
      "Wait for your turn before submitting a move.",
    );
  }

  if (!entity) {
    return;
  }

  const currentEntity = room.chain.at(-1);

  if (
    currentEntity &&
    !isAllowedTransition(currentEntity.type, entity.type)
  ) {
    throw new GameActionError(
      "INVALID_TRANSITION",
      currentEntity.type === "PLAYER"
        ? "That entity type cannot follow the current player."
        : "A team, college, or jersey number must be followed by a player.",
      {
        currentType: currentEntity.type,
        submittedType: entity.type,
      },
    );
  }

  if (room.usedEntities[entity.id]) {
    throw new GameActionError(
      "ENTITY_ALREADY_USED",
      `${entity.name} has already appeared in this game.`,
    );
  }
}

function nextTurnUid(room: InProgressRoom): string {
  const players = Object.values(room.players).sort(
    (first, second) => first.joinOrder - second.joinOrder,
  );
  const currentIndex = players.findIndex(
    (player) => player.uid === room.currentTurn,
  );

  if (currentIndex < 0 || players.length === 0) {
    throw new Error("Stored room has invalid turn data.");
  }

  return players[(currentIndex + 1) % players.length]!.uid;
}

function completeRoom(
  room: InProgressRoom,
  endedAt: number,
): EndedRoom {
  return {
    status: "ENDED",
    creatorUid: room.creatorUid,
    players: room.players,
    chain: room.chain,
    usedEntities: room.usedEntities,
    usedTeams: room.usedTeams,
    startedAt: room.startedAt,
    createdAt: room.createdAt,
    updatedAt: endedAt,
    terminalReason: {
      type: "COMPLETED",
      endedAt,
    },
  };
}

export async function submitMove({
  roomCode,
  submission,
  uid,
}: SubmitMoveParams): Promise<SubmitMoveResult> {
  const roomRef = adminRealtimeDatabase.ref(`rooms/${roomCode}`);
  const initialSnapshot = await roomRef.get();
  const initialRoom = parseActiveRoom(initialSnapshot.val());

  assertCanSubmit(initialRoom, uid);

  const currentEntity = initialRoom.chain.at(-1) ?? null;
  const initialChainLength = initialRoom.chain.length;
  const initialLastEntryId = currentEntity?.entryId;

  let validation;

  try {
    validation = await validateMove(currentEntity, submission);
  } catch (error) {
    if (error instanceof AiValidatorUnavailableError) {
      throw new GameActionError(
        "VALIDATOR_UNAVAILABLE",
        "The AI judge is temporarily unavailable. Try again.",
      );
    }

    throw error;
  }

  if (!validation.valid) {
    throw new GameActionError(
      "INVALID_MOVE",
      validation.reason,
      {
        validatorCode: validation.code,
        ...(validation.sources
          ? { sources: validation.sources }
          : {}),
      },
    );
  }

  assertCanSubmit(initialRoom, uid, validation.entity);

  const submittedAt = Date.now();
  const entry: ChainEntry = {
    ...validation.entity,
    entryId: randomUUID(),
    sequence: initialRoom.chain.length,
    submittedByUid: uid,
    submittedAt,
    ...(validation.relationship
      ? { relationship: validation.relationship }
      : {}),
  };

  const transaction = await roomRef.transaction((currentValue) => {
    const currentRoom = inProgressRoomSchema.safeParse(currentValue);

    if (!currentRoom.success) {
      return currentValue;
    }

    if (
      currentRoom.data.chain.length !== initialChainLength ||
      currentRoom.data.chain.at(-1)?.entryId !== initialLastEntryId
    ) {
      return currentValue;
    }

    try {
      assertCanSubmit(currentRoom.data, uid, validation.entity);
    } catch {
      return currentValue;
    }

    const nextUsedTeams = validation.entity.canonicalTeamId
      ? {
          ...currentRoom.data.usedTeams,
          [validation.entity.canonicalTeamId]: true as const,
        }
      : currentRoom.data.usedTeams;

    const updatedRoom: InProgressRoom = {
      ...currentRoom.data,
      currentTurn: nextTurnUid(currentRoom.data),
      chain: [
        ...currentRoom.data.chain,
        {
          ...entry,
          sequence: currentRoom.data.chain.length,
        },
      ],
      usedEntities: {
        ...currentRoom.data.usedEntities,
        [validation.entity.id]: true,
      },
      usedTeams: nextUsedTeams,
      updatedAt: submittedAt,
    };

    if (Object.keys(nextUsedTeams).length === NFL_TEAM_COUNT) {
      return completeRoom(updatedRoom, submittedAt);
    }

    return updatedRoom;
  });

  const finalValue = transaction.snapshot.val();

  if (finalValue === null) {
    throw new GameActionError(
      "ROOM_NOT_FOUND",
      "That room does not exist.",
    );
  }

  const finalRoom = roomSchema.safeParse(finalValue);

  if (!finalRoom.success) {
    throw new Error("Stored room failed validation after move submission.");
  }

  if (finalRoom.data.status === "WAITING") {
    throw new GameActionError(
      "ROOM_NOT_IN_PROGRESS",
      "That game is not currently in progress.",
    );
  }

  const storedEntry = finalRoom.data.chain.find(
    (candidate) => candidate.entryId === entry.entryId,
  );

  if (!storedEntry) {
    if (finalRoom.data.status === "ENDED") {
      throw new GameActionError(
        "ROOM_NOT_IN_PROGRESS",
        "That game has already ended.",
      );
    }

    assertCanSubmit(finalRoom.data, uid, validation.entity);
    throw new Error("The room changed before the move could be committed.");
  }

  return {
    roomCode,
    room: finalRoom.data,
    entry: storedEntry,
  };
}
