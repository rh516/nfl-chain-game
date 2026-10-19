import "client-only";

import { roomSchema, type Room } from "@nfl-chain/shared";
import {
  onValue,
  ref,
  type Unsubscribe,
} from "firebase/database";

import { realtimeDatabase } from "@/lib/firebase/client";

export type RoomSubscriptionHandlers = {
  onRoom(room: Room): void;
  onError(error: Error): void;
};

export function subscribeToRoom(
  roomCode: string,
  { onRoom, onError }: RoomSubscriptionHandlers,
): Unsubscribe {
  const roomRef = ref(realtimeDatabase, `rooms/${roomCode}`);

  return onValue(
    roomRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onError(new Error("That room does not exist."));
        return;
      }

      const result = roomSchema.safeParse(snapshot.val());

      if (!result.success) {
        onError(new Error("The room data is invalid."));
        return;
      }

      onRoom(result.data);
    },
    onError,
  );
}
