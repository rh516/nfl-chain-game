import { z } from "zod";

export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;
export const ROOM_CODE_LENGTH = 6;
export const DISPLAY_NAME_MAX_LENGTH = 24;

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a display name.")
  .max(
    DISPLAY_NAME_MAX_LENGTH,
    `Display names cannot exceed ${DISPLAY_NAME_MAX_LENGTH} characters.`,
  );

export const roomCodeSchema = z
  .string()
  .trim()
  .length(
    ROOM_CODE_LENGTH,
    `Room codes must contain ${ROOM_CODE_LENGTH} characters.`,
  )
  .regex(
    /^[a-zA-Z0-9]+$/,
    "Room codes may only contain letters and numbers.",
  )
  .transform((roomCode) => roomCode.toUpperCase());

export const roomStatusSchema = z.enum([
  "WAITING",
  "IN_PROGRESS",
  "ENDED",
]);

export const createRoomInputSchema = z.object({
  displayName: displayNameSchema,
});

export const joinRoomInputSchema = z.object({
  roomCode: roomCodeSchema,
  displayName: displayNameSchema,
});

export const roomMemberSchema = z.object({
  uid: z.string().min(1),
  displayName: displayNameSchema,
  joinOrder: z.number().int().min(0).max(MAX_PLAYERS - 1),
  joinedAt: z.number().int().nonnegative(),
});

export const roomBaseSchema = z.object({
  creatorUid: z.string().min(1),
  players: z.record(z.string(), roomMemberSchema),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const waitingRoomSchema = roomBaseSchema
  .extend({
    status: z.literal("WAITING")
  })
  .refine(
    (room) => {
      const playerCount = Object.keys(room.players).length;
      return playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS;
    },
    {
      message: `A waiting room must contain between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`,
      path: ["players"],
    },
  )
  .refine(
    (room) => room.creatorUid in room.players,
    {
      message: "The room creator must be a room member.",
      path: ["creatorUid"],
    },
  );

export const waitingRoomResultSchema = z.object({
  roomCode: roomCodeSchema,
  room: waitingRoomSchema,
});

export type RoomStatus = z.infer<typeof roomStatusSchema>;
export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomInputSchema>;
export type RoomMember = z.infer<typeof roomMemberSchema>;
export type RoomBase = z.infer<typeof roomBaseSchema>;
export type WaitingRoom = z.infer<typeof waitingRoomSchema>;
export type WaitingRoomResult = z.infer<typeof waitingRoomResultSchema>;