import "server-only";

import {
  inProgressRoomSchema,
  roomSchema,
  waitingRoomSchema,
  type InProgressRoom,
  type StartGameInput,
  type StartGameResult,
  type WaitingRoom,
} from "@nfl-chain/shared";

import { adminRealtimeDatabase } from "@/lib/firebase/admin";
import { GameActionError } from "@/lib/game/game-action-error";

type StartGameParams = StartGameInput & {
  uid: string;
};

function firstPlayerUid(room: WaitingRoom): string {
  const firstPlayer = Object.values(room.players).sort(
    (first, second) => first.joinOrder - second.joinOrder,
  )[0];

  if (!firstPlayer) {
    throw new Error("A waiting room must contain a player.");
  }

  return firstPlayer.uid;
}

function buildInProgressRoom(
  room: WaitingRoom,
  startedAt: number,
): InProgressRoom {
  return {
    ...room,
    status: "IN_PROGRESS",
    currentTurn: firstPlayerUid(room),
    chain: [],
    usedEntities: {},
    usedTeams: {},
    startedAt,
    updatedAt: startedAt,
  };
}

export async function startGame({
  roomCode,
  uid,
}: StartGameParams): Promise<StartGameResult> {
  const roomRef = adminRealtimeDatabase.ref(`rooms/${roomCode}`);
  const startedAt = Date.now();

  const transaction = await roomRef.transaction((currentRoom) => {
    if (currentRoom === null) {
      return null;
    }

    const waitingRoom = waitingRoomSchema.safeParse(currentRoom);

    if (!waitingRoom.success || waitingRoom.data.creatorUid !== uid) {
      return currentRoom;
    }

    return buildInProgressRoom(waitingRoom.data, startedAt);
  });

  const rawRoom = transaction.snapshot.val();

  if (rawRoom === null) {
    throw new GameActionError(
      "ROOM_NOT_FOUND",
      "That room does not exist.",
    );
  }

  const parsedRoom = roomSchema.safeParse(rawRoom);

  if (!parsedRoom.success) {
    throw new Error("Stored room failed validation.");
  }

  if (parsedRoom.data.creatorUid !== uid) {
    throw new GameActionError(
      "ONLY_CREATOR",
      "Only the room creator can start the game.",
    );
  }

  const activeRoom = inProgressRoomSchema.safeParse(parsedRoom.data);

  if (!activeRoom.success) {
    throw new GameActionError(
      "ROOM_NOT_WAITING",
      "That room cannot be started.",
    );
  }

  return {
    roomCode,
    room: activeRoom.data,
  };
}
