import "server-only";

import type {
  CreateRoomInput,
  WaitingRoom,
} from "@nfl-chain/shared";

import { adminRealtimeDatabase } from "@/lib/firebase/admin";
import { generateRoomCode } from "@/lib/rooms/generate-room-code";

const MAX_ROOM_CODE_ATTEMPTS = 10;

type CreateRoomParams = CreateRoomInput & {
  uid: string;
};

export type CreateRoomResult = {
  roomCode: string;
  room: WaitingRoom;
};

function buildWaitingRoom({
  uid,
  displayName,
}: CreateRoomParams): WaitingRoom {
  const now = Date.now();

  return {
    status: "WAITING",
    creatorUid: uid,
    players: {
      [uid]: {
        uid,
        displayName,
        joinOrder: 0,
        joinedAt: now,
      },
    },
    currentTurn: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function tryCreateRoom(
  roomCode: string,
  room: WaitingRoom,
) {
  const roomRef = adminRealtimeDatabase.ref(`rooms/${roomCode}`);

  const result = await roomRef.transaction((currentRoom) => {
    if (currentRoom !== null) {
      return;
    }

    return room;
  });

  return result.committed;
}

export async function createRoom(
  params: CreateRoomParams,
): Promise<CreateRoomResult> {
  const room = buildWaitingRoom(params);

  for (
    let attempt = 0;
    attempt < MAX_ROOM_CODE_ATTEMPTS;
    attempt += 1
  ) {
    const roomCode = generateRoomCode();
    const created = await tryCreateRoom(roomCode, room);

    if (created) {
      return {
        roomCode,
        room,
      };
    }
  }

  throw new Error("Unable to generate an available room code.");
}

