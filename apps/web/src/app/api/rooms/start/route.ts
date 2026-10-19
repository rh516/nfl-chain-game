import { startGameInputSchema } from "@nfl-chain/shared";
import { z } from "zod";

import {
  AuthenticationError,
  requireUser,
} from "@/lib/auth/require-user";
import {
  GameActionError,
  gameActionErrorStatus,
} from "@/lib/game/game-action-error";
import { startGame } from "@/lib/game/start-game";
import {
  errorResponse,
  readJson,
} from "@/lib/http/route-helpers";

async function handleStartGame(request: Request) {
  const user = await requireUser(request);
  const body = await readJson(request);
  const validation = startGameInputSchema.safeParse(body);

  if (!validation.success) {
    const { fieldErrors } = z.flattenError(validation.error);

    return errorResponse(
      400,
      "INVALID_REQUEST",
      "The request body is invalid.",
      fieldErrors,
    );
  }

  const result = await startGame({
    uid: user.uid,
    ...validation.data,
  });

  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    return await handleStartGame(request);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    if (error instanceof GameActionError) {
      return errorResponse(
        gameActionErrorStatus(error.code),
        error.code,
        error.message,
        error.details,
      );
    }

    console.error("Failed to start game.", error);

    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "Unable to start the game.",
    );
  }
}
