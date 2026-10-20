import {
  NFL_TEAMS,
  entityTypeSchema,
  type MoveValidationResult,
  type NflTeam,
  type NormalizedEntity,
} from "@nfl-chain/shared";
import { z } from "zod";

export const aiMoveDecisionSchema = z.object({
  valid: z.boolean(),
  code: z.enum([
    "VALID",
    "INVALID_ENTITY",
    "INVALID_RELATIONSHIP",
    "AMBIGUOUS",
  ]),
  entityType: entityTypeSchema.nullable(),
  normalizedName: z.string().nullable(),
  canonicalTeamId: z.string().nullable(),
});

export type AiMoveDecision = z.infer<typeof aiMoveDecisionSchema>;

const teamsById = new Map<string, NflTeam>(
  NFL_TEAMS.map((team) => [team.id, team]),
);

export class AiValidatorUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiValidatorUnavailableError";
  }
}

function normalizeLookupKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function normalizeEntity(
  decision: AiMoveDecision,
): NormalizedEntity | undefined {
  if (!decision.entityType || !decision.normalizedName) {
    return undefined;
  }

  if (decision.entityType === "NFL_TEAM") {
    if (!decision.canonicalTeamId) {
      return undefined;
    }

    const team = teamsById.get(decision.canonicalTeamId);

    if (!team) {
      return undefined;
    }

    return {
      id: `nfl_team:${team.id}`,
      type: "NFL_TEAM",
      name: team.name,
      canonicalTeamId: team.id,
    };
  }

  if (decision.canonicalTeamId !== null) {
    return undefined;
  }

  if (decision.entityType === "JERSEY_NUMBER") {
    const match = decision.normalizedName.match(/^#?(\d{1,2})$/);

    if (!match) {
      return undefined;
    }

    const number = Number(match[1]);

    if (number < 0 || number > 99) {
      return undefined;
    }

    return {
      id: `jersey_number:${number}`,
      type: "JERSEY_NUMBER",
      name: `#${number}`,
    };
  }

  const name = decision.normalizedName.trim().replace(/\s+/g, " ");
  const id = normalizeLookupKey(name);

  if (!name || !id || name.length > 80) {
    return undefined;
  }

  return {
    id: `${decision.entityType.toLowerCase()}:${id}`,
    type: decision.entityType,
    name,
  };
}

type InvalidMoveCode = Extract<
  MoveValidationResult,
  { valid: false }
>["code"];

function invalidRelationshipReason(
  currentEntity: NormalizedEntity | null,
  decision: AiMoveDecision,
): string {
  const submittedEntity = normalizeEntity(decision);

  if (!currentEntity || !submittedEntity) {
    return "That relationship could not be verified.";
  }

  if (
    currentEntity.type === "PLAYER" &&
    submittedEntity.type === "PLAYER"
  ) {
    return `${currentEntity.name} and ${submittedEntity.name} were not teammates during the same NFL or college season.`;
  }

  const player =
    currentEntity.type === "PLAYER"
      ? currentEntity
      : submittedEntity.type === "PLAYER"
        ? submittedEntity
        : undefined;
  const relatedEntity = player === currentEntity
    ? submittedEntity
    : currentEntity;

  if (!player) {
    return `${submittedEntity.name} cannot be linked to ${currentEntity.name} under the game rules.`;
  }

  switch (relatedEntity.type) {
    case "NFL_TEAM":
      return `${player.name} did not play for the ${relatedEntity.name}.`;
    case "COLLEGE":
      return `${player.name} did not play college football for ${relatedEntity.name}.`;
    case "JERSEY_NUMBER":
      return `${player.name} did not wear ${relatedEntity.name} in the NFL or college.`;
    default:
      return `${submittedEntity.name} cannot be linked to ${currentEntity.name} under the game rules.`;
  }
}

function invalidMoveReason(
  code: InvalidMoveCode,
  currentEntity: NormalizedEntity | null,
  decision: AiMoveDecision,
): string {
  if (code === "AMBIGUOUS") {
    return "That answer is ambiguous. Enter a more specific name.";
  }

  if (code === "INVALID_RELATIONSHIP") {
    return invalidRelationshipReason(currentEntity, decision);
  }

  return "That answer is not a recognized player, NFL team, college, or jersey number.";
}

function validRelationshipSummary(
  currentEntity: NormalizedEntity,
  submittedEntity: NormalizedEntity,
): string {
  if (
    currentEntity.type === "PLAYER" &&
    submittedEntity.type === "PLAYER"
  ) {
    return `${currentEntity.name} and ${submittedEntity.name} were teammates during the same NFL or college season.`;
  }

  const player =
    currentEntity.type === "PLAYER"
      ? currentEntity
      : submittedEntity.type === "PLAYER"
        ? submittedEntity
        : undefined;
  const relatedEntity = player === currentEntity
    ? submittedEntity
    : currentEntity;

  if (!player) {
    throw new AiValidatorUnavailableError(
      "The AI judge returned an invalid relationship type.",
    );
  }

  switch (relatedEntity.type) {
    case "NFL_TEAM":
      return `${player.name} did play for the ${relatedEntity.name}.`;
    case "COLLEGE":
      return `${player.name} played college football for ${relatedEntity.name}.`;
    case "JERSEY_NUMBER":
      return `${player.name} wore ${relatedEntity.name} in the NFL or college.`;
    default:
      throw new AiValidatorUnavailableError(
        "The AI judge returned an invalid relationship type.",
      );
  }
}

export function mapAiMoveDecision(
  decision: AiMoveDecision,
  currentEntity: NormalizedEntity | null,
): MoveValidationResult {
  if (!decision.valid) {
    const code =
      decision.code === "AMBIGUOUS"
        ? "AMBIGUOUS"
        : decision.code === "INVALID_RELATIONSHIP"
          ? "INVALID_RELATIONSHIP"
          : "INVALID_ENTITY";

    return {
      valid: false,
      code,
      reason: invalidMoveReason(code, currentEntity, decision),
    };
  }

  if (decision.code !== "VALID") {
    throw new AiValidatorUnavailableError(
      "The AI judge returned an inconsistent decision.",
    );
  }

  const entity = normalizeEntity(decision);

  if (!entity) {
    throw new AiValidatorUnavailableError(
      "The AI judge returned an invalid normalized entity.",
    );
  }

  if (!currentEntity) {
    return { valid: true, entity };
  }

  return {
    valid: true,
    entity,
    relationship: {
      kind: "AI",
      summary: validRelationshipSummary(currentEntity, entity),
    },
  };
}
