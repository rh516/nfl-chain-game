import type { NormalizedEntity, RelationshipSource } from "@nfl-chain/shared";
import { describe, expect, it } from "vitest";

import {
  AiValidatorUnavailableError,
  type AiMoveDecision,
  mapAiMoveDecision,
} from "./ai-validator-decision";

const peytonManning: NormalizedEntity = {
  id: "player:peyton-manning",
  type: "PLAYER",
  name: "Peyton Manning",
};

const source: RelationshipSource = {
  title: "Example source",
  url: "https://example.com/football",
};

function validDecision(
  overrides: Partial<AiMoveDecision> = {},
): AiMoveDecision {
  return {
    valid: true,
    code: "VALID",
    entityType: "PLAYER",
    normalizedName: "Marvin Harrison",
    canonicalTeamId: null,
    relationshipSummary:
      "Peyton Manning and Marvin Harrison were Indianapolis Colts teammates.",
    reason: "The relationship is verified.",
    ...overrides,
  };
}

describe("mapAiMoveDecision", () => {
  it("normalizes a canonical NFL franchise from the approved team list", () => {
    const result = mapAiMoveDecision(
      validDecision({
        entityType: "NFL_TEAM",
        normalizedName: "Denver Broncos",
        canonicalTeamId: "denver-broncos",
        relationshipSummary: null,
      }),
      null,
      [],
    );

    expect(result).toEqual({
      valid: true,
      entity: {
        id: "nfl_team:denver-broncos",
        type: "NFL_TEAM",
        name: "Denver Broncos",
        canonicalTeamId: "denver-broncos",
      },
    });
  });

  it("stores an AI relationship and its supporting sources", () => {
    const result = mapAiMoveDecision(
      validDecision(),
      peytonManning,
      [source],
    );

    expect(result).toMatchObject({
      valid: true,
      entity: {
        id: "player:marvin-harrison",
        type: "PLAYER",
        name: "Marvin Harrison",
      },
      relationship: {
        kind: "AI",
        sources: [source],
      },
    });
  });

  it("normalizes jersey numbers", () => {
    const result = mapAiMoveDecision(
      validDecision({
        entityType: "JERSEY_NUMBER",
        normalizedName: "#18",
        relationshipSummary: "Peyton Manning wore number 18.",
      }),
      peytonManning,
      [source],
    );

    expect(result).toMatchObject({
      valid: true,
      entity: {
        id: "jersey_number:18",
        type: "JERSEY_NUMBER",
        name: "#18",
      },
    });
  });

  it("preserves an invalid relationship without creating an entity", () => {
    const result = mapAiMoveDecision(
      {
        valid: false,
        code: "INVALID_RELATIONSHIP",
        entityType: "COLLEGE",
        normalizedName: "Alabama",
        canonicalTeamId: null,
        relationshipSummary: null,
        reason: "That player did not play football for Alabama.",
      },
      peytonManning,
      [source],
    );

    expect(result).toEqual({
      valid: false,
      code: "INVALID_RELATIONSHIP",
      reason: "That player did not play football for Alabama.",
      sources: [source],
    });
  });

  it("rejects a model-generated NFL franchise ID outside the canonical list", () => {
    expect(() =>
      mapAiMoveDecision(
        validDecision({
          entityType: "NFL_TEAM",
          normalizedName: "London Jaguars",
          canonicalTeamId: "london-jaguars",
        }),
        peytonManning,
        [],
      ),
    ).toThrow(AiValidatorUnavailableError);
  });

  it("rejects a valid relationship response that omits its summary", () => {
    expect(() =>
      mapAiMoveDecision(
        validDecision({ relationshipSummary: null }),
        peytonManning,
        [],
      ),
    ).toThrow(AiValidatorUnavailableError);
  });
});
