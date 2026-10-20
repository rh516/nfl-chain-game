import {
  NFL_TEAMS,
  entityTypeSchema,
  type MoveValidationResult,
  type NflTeam,
  type NormalizedEntity,
  type RelationshipSource,
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
  relationshipSummary: z.string().nullable(),
  reason: z.string(),
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

export function mapAiMoveDecision(
  decision: AiMoveDecision,
  currentEntity: NormalizedEntity | null,
  sources: RelationshipSource[],
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
      reason: decision.reason.trim() || "That move could not be verified.",
      ...(sources.length > 0 ? { sources } : {}),
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

  const summary = decision.relationshipSummary?.trim();

  if (!summary) {
    throw new AiValidatorUnavailableError(
      "The AI judge omitted the verified relationship.",
    );
  }

  return {
    valid: true,
    entity,
    relationship: {
      kind: "AI",
      summary,
      ...(sources.length > 0 ? { sources } : {}),
    },
  };
}
