import { createRoomInputSchema } from "@nfl-chain/shared";
import {
  AuthenticationError,
  requireUser,
} from "@/lib/auth/require-user";
import { createRoom } from "@/lib/rooms/create-room";
import { z } from "zod";
import {
  errorResponse,
  readJson,
} from "@/lib/http/route-helpers";

async function handleCreateRoom(request: Request) {
  const user = await requireUser(request);
  const body = await readJson(request);
  const validation = createRoomInputSchema.safeParse(body);

  if (!validation.success) {
    const { fieldErrors } = z.flattenError(validation.error);

    return errorResponse(
      400,
      "INVALID_REQUEST",
      "The request body is invalid.",
      fieldErrors,
    );
  }

  const result = await createRoom({
    uid: user.uid,
    ...validation.data,
  });

  return Response.json(result, { status: 201 });
}

export async function POST(request: Request) {
  try {
    return await handleCreateRoom(request);
  } 
  catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    console.error("Failed to create room.", error);

    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Unable to create the room.",
    );
  }
}