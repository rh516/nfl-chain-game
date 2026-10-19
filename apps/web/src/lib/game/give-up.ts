import "server-only";

import {
  endedRoomSchema,
  inProgressRoomSchema,
  roomSchema,
  type EndedRoom,
  type GiveUpInput,
  type GiveUpResult,
  type InProgressRoom,
} from "@nfl-chain/shared";

import { adminRealtimeDatabase } from "@/lib/firebase/admin";
import { GameActionError } from "@/lib/game/game-action-error";

type GiveUpParams = GiveUpInput & {
  uid: string;
};

function endRoom(
  room: InProgressRoom,
  uid: string,
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
      type: "GAVE_UP",
      byUid: uid,
      endedAt,
    },
  };
}

export async function giveUp({
  roomCode,
  uid,
}: GiveUpParams): Promise<GiveUpResult> {
  const roomRef = adminRealtimeDatabase.ref(`rooms/${roomCode}`);
  const endedAt = Date.now();

  const transaction = await roomRef.transaction((currentValue) => {
    const currentRoom = inProgressRoomSchema.safeParse(currentValue);

    if (!currentRoom.success || !(uid in currentRoom.data.players)) {
      return currentValue;
    }

    return endRoom(currentRoom.data, uid, endedAt);
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

  if (!(uid in parsedRoom.data.players)) {
    throw new GameActionError(
      "NOT_A_MEMBER",
      "You are not a member of that room.",
    );
  }

  const endedRoom = endedRoomSchema.safeParse(parsedRoom.data);

  if (
    !endedRoom.success ||
    endedRoom.data.terminalReason.type !== "GAVE_UP" ||
    endedRoom.data.terminalReason.byUid !== uid ||
    endedRoom.data.terminalReason.endedAt !== endedAt
  ) {
    throw new GameActionError(
      "ROOM_NOT_IN_PROGRESS",
      "That game is not currently in progress.",
    );
  }

  return {
    roomCode,
    room: endedRoom.data,
  };
}
