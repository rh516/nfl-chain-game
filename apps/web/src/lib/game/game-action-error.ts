import "server-only";

export type GameActionErrorCode =
  | "ROOM_NOT_FOUND"
  | "NOT_A_MEMBER"
  | "ONLY_CREATOR"
  | "ROOM_NOT_WAITING"
  | "ROOM_NOT_IN_PROGRESS"
  | "NOT_YOUR_TURN"
  | "INVALID_TRANSITION"
  | "ENTITY_ALREADY_USED"
  | "INVALID_MOVE"
  | "VALIDATOR_UNAVAILABLE";

export class GameActionError extends Error {
  constructor(
    public readonly code: GameActionErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "GameActionError";
  }
}

export function gameActionErrorStatus(
  code: GameActionErrorCode,
): number {
  switch (code) {
    case "ROOM_NOT_FOUND":
      return 404;
    case "NOT_A_MEMBER":
    case "ONLY_CREATOR":
      return 403;
    case "INVALID_TRANSITION":
    case "INVALID_MOVE":
      return 422;
    case "VALIDATOR_UNAVAILABLE":
      return 503;
    default:
      return 409;
  }
}
