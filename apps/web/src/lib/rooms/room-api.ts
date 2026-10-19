import "client-only";

import {
  giveUpResultSchema,
  startGameResultSchema,
  submitMoveResultSchema,
  waitingRoomResultSchema,
  type CreateRoomInput,
  type GiveUpInput,
  type GiveUpResult,
  type JoinRoomInput,
  type StartGameInput,
  type StartGameResult,
  type SubmitMoveInput,
  type SubmitMoveResult,
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

type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

function getApiError(value: unknown): ApiErrorBody | undefined {
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

  return {
    code:
      "code" in error && typeof error.code === "string"
        ? error.code
        : "REQUEST_FAILED",
    message: error.message,
    ...("details" in error ? { details: error.details } : {}),
  };
}

export class RoomApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "RoomApiError";
  }
}

async function authenticatedPost(
  path: string,
  input: unknown,
): Promise<unknown> {
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
    const apiError = getApiError(body);

    throw new RoomApiError(
      apiError?.code ?? "REQUEST_FAILED",
      apiError?.message ?? "The room request failed.",
      apiError?.details,
    );
  }

  return body;
}

async function requestWaitingRoom(
  path: string,
  input: CreateRoomInput | JoinRoomInput,
): Promise<WaitingRoomResult> {
  const body = await authenticatedPost(path, input);

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

export async function startGameRequest(
  input: StartGameInput,
): Promise<StartGameResult> {
  const body = await authenticatedPost("/api/rooms/start", input);
  const result = startGameResultSchema.safeParse(body);

  if (!result.success) {
    throw new Error("The server returned invalid game data.");
  }

  return result.data;
}

export async function submitMoveRequest(
  input: SubmitMoveInput,
): Promise<SubmitMoveResult> {
  const body = await authenticatedPost("/api/rooms/moves", input);
  const result = submitMoveResultSchema.safeParse(body);

  if (!result.success) {
    throw new Error("The server returned invalid move data.");
  }

  return result.data;
}

export async function giveUpRequest(
  input: GiveUpInput,
): Promise<GiveUpResult> {
  const body = await authenticatedPost("/api/rooms/give-up", input);
  const result = giveUpResultSchema.safeParse(body);

  if (!result.success) {
    throw new Error("The server returned invalid ended-game data.");
  }

  return result.data;
}
