import { z } from "zod";

import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  roomBaseSchema,
  roomCodeSchema,
  waitingRoomSchema,
} from "./lobby";

export const entityTypeSchema = z.enum([
  "PLAYER",
  "NFL_TEAM",
  "COLLEGE",
  "JERSEY_NUMBER",
]);

export const moveSubmissionSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(1, "Enter an answer.")
    .max(80, "Answers cannot exceed 80 characters."),
});

export const normalizedEntitySchema = z.object({
  id: z.string().min(1),
  type: entityTypeSchema,
  name: z.string().min(1),
  canonicalTeamId: z.string().min(1).optional(),
});

export const relationshipResultSchema = z.object({
  kind: z.literal("DETERMINISTIC"),
  summary: z.string().min(1),
});

export const chainEntrySchema = normalizedEntitySchema.extend({
  entryId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  submittedByUid: z.string().min(1),
  submittedAt: z.number().int().nonnegative(),
  relationship: relationshipResultSchema.optional(),
});

const chainSchema = z.array(chainEntrySchema).default([]);
const usedEntitiesSchema = z.record(z.string(), z.literal(true)).default({});
const usedTeamsSchema = z.record(z.string(), z.literal(true)).default({});

export const inProgressRoomSchema = roomBaseSchema
  .extend({
    status: z.literal("IN_PROGRESS"),
    currentTurn: z.string().min(1),
    chain: chainSchema,
    usedEntities: usedEntitiesSchema,
    usedTeams: usedTeamsSchema,
    startedAt: z.number().int().nonnegative(),
  })
  .refine(
    (room) => {
      const playerCount = Object.keys(room.players).length;
      return playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS;
    },
    {
      message: `An active room must contain between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`,
      path: ["players"],
    },
  )
  .refine((room) => room.currentTurn in room.players, {
    message: "The current turn must belong to a room member.",
    path: ["currentTurn"],
  });

export const terminalReasonSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("COMPLETED"),
    endedAt: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("GAVE_UP"),
    endedAt: z.number().int().nonnegative(),
    byUid: z.string().min(1),
  }),
]);

export const endedRoomSchema = roomBaseSchema
  .extend({
    status: z.literal("ENDED"),
    chain: chainSchema,
    usedEntities: usedEntitiesSchema,
    usedTeams: usedTeamsSchema,
    startedAt: z.number().int().nonnegative(),
    terminalReason: terminalReasonSchema,
  })
  .refine(
    (room) => Object.keys(room.players).length <= MAX_PLAYERS,
    {
      message: `An ended room cannot contain more than ${MAX_PLAYERS} players.`,
      path: ["players"],
    },
  );

export const roomSchema = z.union([
  waitingRoomSchema,
  inProgressRoomSchema,
  endedRoomSchema,
]);

export const roomResultSchema = z.object({
  roomCode: roomCodeSchema,
  room: roomSchema,
});

export const startGameInputSchema = z.object({
  roomCode: roomCodeSchema,
});

export const startGameResultSchema = z.object({
  roomCode: roomCodeSchema,
  room: inProgressRoomSchema,
});

export const submitMoveInputSchema = z.object({
  roomCode: roomCodeSchema,
  submission: moveSubmissionSchema,
});

export const submitMoveResultSchema = z.object({
  roomCode: roomCodeSchema,
  room: z.union([inProgressRoomSchema, endedRoomSchema]),
  entry: chainEntrySchema,
});

export const giveUpInputSchema = z.object({
  roomCode: roomCodeSchema,
});

export const giveUpResultSchema = z.object({
  roomCode: roomCodeSchema,
  room: endedRoomSchema,
});

export type EntityType = z.infer<typeof entityTypeSchema>;
export type MoveSubmission = z.infer<typeof moveSubmissionSchema>;
export type NormalizedEntity = z.infer<typeof normalizedEntitySchema>;
export type RelationshipResult = z.infer<typeof relationshipResultSchema>;
export type ChainEntry = z.infer<typeof chainEntrySchema>;
export type InProgressRoom = z.infer<typeof inProgressRoomSchema>;
export type TerminalReason = z.infer<typeof terminalReasonSchema>;
export type EndedRoom = z.infer<typeof endedRoomSchema>;
export type Room = z.infer<typeof roomSchema>;
export type RoomResult = z.infer<typeof roomResultSchema>;
export type StartGameInput = z.infer<typeof startGameInputSchema>;
export type StartGameResult = z.infer<typeof startGameResultSchema>;
export type SubmitMoveInput = z.infer<typeof submitMoveInputSchema>;
export type SubmitMoveResult = z.infer<typeof submitMoveResultSchema>;
export type GiveUpInput = z.infer<typeof giveUpInputSchema>;
export type GiveUpResult = z.infer<typeof giveUpResultSchema>;

export function isAllowedTransition(
  currentType: EntityType,
  nextType: EntityType,
): boolean {
  if (currentType === "PLAYER") {
    return true;
  }

  return nextType === "PLAYER";
}

export type MoveValidationResult =
  | {
      valid: true;
      entity: NormalizedEntity;
      relationship?: RelationshipResult;
    }
  | {
      valid: false;
      code: "INVALID_ENTITY" | "UNKNOWN_TEAM";
      reason: string;
    };

export type MoveValidator = (
  currentEntity: NormalizedEntity | null,
  submission: MoveSubmission,
) => Promise<MoveValidationResult>;
