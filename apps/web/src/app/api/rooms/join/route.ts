import { joinRoomInputSchema } from "@nfl-chain/shared";
import { z } from "zod";

import {
  AuthenticationError,
  requireUser,
} from "@/lib/auth/require-user";
import {
  errorResponse,
  readJson,
} from "@/lib/http/route-helpers";
import {
  JoinRoomError,
  joinRoom,
} from "@/lib/rooms/join-room";

async function handleJoinRoom(request: Request) {
  const user = await requireUser(request);
  const body = await readJson(request);
  const validation = joinRoomInputSchema.safeParse(body);

  if (!validation.success) {
    const { fieldErrors } = z.flattenError(validation.error);

    return errorResponse(
      400,
      "INVALID_REQUEST",
      "The request body is invalid.",
      fieldErrors,
    );
  }

  const result = await joinRoom({
    uid: user.uid,
    ...validation.data,
  });

  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    return await handleJoinRoom(request);
  } 
  catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    if (error instanceof JoinRoomError) {
      const status =
        error.code === "ROOM_NOT_FOUND" ? 404 : 409;

      return errorResponse(
        status,
        error.code,
        error.message,
      );
    }

    console.error("Failed to join room.", error);

    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Unable to join the room.",
    );
  }
}