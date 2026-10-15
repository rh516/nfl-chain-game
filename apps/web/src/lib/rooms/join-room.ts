import "server-only";

import {
  MAX_PLAYERS,
  waitingRoomSchema,
  type JoinRoomInput,
  type WaitingRoom,
} from "@nfl-chain/shared";
import { adminRealtimeDatabase } from "@/lib/firebase/admin";

type JoinRoomParams = JoinRoomInput & {
  uid: string;
};

export type JoinRoomResult = {
  roomCode: string;
  room: WaitingRoom;
};

export type JoinRoomErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_WAITING"
  | "ROOM_FULL";

export class JoinRoomError extends Error {
  constructor(
    public readonly code: JoinRoomErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "JoinRoomError";
  }
}

function findAvailableJoinOrder(
  players: WaitingRoom["players"],
): number | undefined {
  const usedJoinOrders = new Set(
    Object.values(players).map((player) => player.joinOrder),
  );

  for (let joinOrder = 0; joinOrder < MAX_PLAYERS; joinOrder += 1) {
    if (!usedJoinOrders.has(joinOrder)) {
      return joinOrder;
    }
  }

  return undefined;
}

function parseJoinableRoom(value: unknown): WaitingRoom {
  if (value === null) {
    throw new JoinRoomError(
      "ROOM_NOT_FOUND",
      "That room does not exist.",
    );
  }

  const status = (value as { status?: unknown }).status;

  if (status === "IN_PROGRESS" || status === "ENDED") {
    throw new JoinRoomError(
      "ROOM_NOT_WAITING",
      "That room is no longer accepting players.",
    );
  }

  const result = waitingRoomSchema.safeParse(value);

  if (!result.success) {
    throw new Error("Stored waiting room failed validation.");
  }

  return result.data;
}

function addPlayerToRoom(
  room: WaitingRoom,
  uid: string,
  displayName: string,
): WaitingRoom {
  if (uid in room.players) {
    return room;
  }

  if (Object.keys(room.players).length >= MAX_PLAYERS) {
    throw new JoinRoomError(
      "ROOM_FULL",
      "That room already has the maximum number of players.",
    );
  }

  const joinOrder = findAvailableJoinOrder(room.players);

  if (joinOrder === undefined) {
    throw new Error("Stored room has invalid join-order data.");
  }

  const now = Date.now();

  return {
    ...room,
    players: {
      ...room.players,
      [uid]: {
        uid,
        displayName,
        joinOrder,
        joinedAt: now,
      },
    },
    updatedAt: now,
  };
}

export async function joinRoom({
  roomCode,
  displayName,
  uid,
}: JoinRoomParams): Promise<JoinRoomResult> {
  const roomRef = adminRealtimeDatabase.ref(`rooms/${roomCode}`);

  const transaction = await roomRef.transaction((currentRoom) => {
    const room = parseJoinableRoom(currentRoom);

    return addPlayerToRoom(room, uid, displayName);
  });

  if (!transaction.committed) {
    throw new Error("The join-room transaction was not committed.");
  }

  const result = waitingRoomSchema.safeParse(
    transaction.snapshot.val(),
  );

  if (!result.success) {
    throw new Error("Joined room failed validation.");
  }

  return {
    roomCode,
    room: result.data,
  };
}