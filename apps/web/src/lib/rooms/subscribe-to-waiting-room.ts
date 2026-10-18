import "client-only";

import {
  waitingRoomSchema,
  type WaitingRoom,
} from "@nfl-chain/shared";
import {
  onValue,
  ref,
  type Unsubscribe,
} from "firebase/database";

import { realtimeDatabase } from "@/lib/firebase/client";

export type WaitingRoomSubscriptionHandlers = {
  onRoom(room: WaitingRoom): void;
  onError(error: Error): void;
};

export function subscribeToWaitingRoom(
  roomCode: string,
  {
    onRoom,
    onError,
  }: WaitingRoomSubscriptionHandlers,
): Unsubscribe {
  const roomRef = ref(
    realtimeDatabase,
    `rooms/${roomCode}`,
  );

  return onValue(
    roomRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onError(new Error("That room does not exist."));
        return;
      }

      const result = waitingRoomSchema.safeParse(
        snapshot.val(),
      );

      if (!result.success) {
        onError(new Error("The room data is invalid."));
        return;
      }

      onRoom(result.data);
    },
    onError,
  );
}