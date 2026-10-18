import { roomCodeSchema } from "@nfl-chain/shared";
import { notFound } from "next/navigation";

import { WaitingRoomClient } from "@/components/waiting-room-client";

type RoomPageProps = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomCode } = await params;
  const result = roomCodeSchema.safeParse(roomCode);

  if (!result.success) {
    notFound();
  }

  return (
    <WaitingRoomClient
      key={result.data}
      roomCode={result.data}
    />
  );
}
