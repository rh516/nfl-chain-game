import "client-only";

import {
  waitingRoomResultSchema,
  type CreateRoomInput,
  type JoinRoomInput,
  type WaitingRoomResult,
} from "@nfl-chain/shared";

import { getOrCreateAnonymousUser } from "@/lib/auth/get-or-create-anonymous-user";

async function readResponseJson(
  response: Response,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function getApiErrorMessage(value: unknown): string | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("error" in value)
  ) {
    return undefined;
  }

  const error = value.error;

  if (
    typeof error !== "object" ||
    error === null ||
    !("message" in error) ||
    typeof error.message !== "string"
  ) {
    return undefined;
  }

  return error.message;
}

async function requestWaitingRoom(
  path: string,
  input: CreateRoomInput | JoinRoomInput,
): Promise<WaitingRoomResult> {
  const user = await getOrCreateAnonymousUser();
  const idToken = await user.getIdToken();

  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const body = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(body) ??
        "The room request failed.",
    );
  }

  const result = waitingRoomResultSchema.safeParse(body);

  if (!result.success) {
    throw new Error(
      "The server returned invalid room data.",
    );
  }

  return result.data;
}

export function createRoomRequest(
  input: CreateRoomInput,
): Promise<WaitingRoomResult> {
  return requestWaitingRoom("/api/rooms", input);
}

export function joinRoomRequest(
  input: JoinRoomInput,
): Promise<WaitingRoomResult> {
  return requestWaitingRoom("/api/rooms/join", input);
}