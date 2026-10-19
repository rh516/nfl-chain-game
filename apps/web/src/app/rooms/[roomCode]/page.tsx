import { roomCodeSchema } from "@nfl-chain/shared";
import { notFound } from "next/navigation";

import { RoomClient } from "@/components/room-client";

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
    <RoomClient
      key={result.data}
      roomCode={result.data}
    />
  );
}
