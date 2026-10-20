import type { NormalizedEntity } from "@nfl-chain/shared";
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

function validDecision(
  overrides: Partial<AiMoveDecision> = {},
): AiMoveDecision {
  return {
    valid: true,
    code: "VALID",
    entityType: "PLAYER",
    normalizedName: "Marvin Harrison",
    canonicalTeamId: null,
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
      }),
      null,
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

  it("stores an AI relationship without exposing web sources", () => {
    const result = mapAiMoveDecision(
      validDecision(),
      peytonManning,
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
        summary:
          "Peyton Manning and Marvin Harrison were teammates during the same NFL or college season.",
      },
    });

    if (result.valid) {
      expect(result.relationship).not.toHaveProperty("sources");
    }
  });

  it("normalizes jersey numbers", () => {
    const result = mapAiMoveDecision(
      validDecision({
        entityType: "JERSEY_NUMBER",
        normalizedName: "#18",
      }),
      peytonManning,
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

  it("returns a direct rejection without suggesting another answer", () => {
    const result = mapAiMoveDecision(
      {
        valid: false,
        code: "INVALID_RELATIONSHIP",
        entityType: "NFL_TEAM",
        normalizedName: "New York Jets",
        canonicalTeamId: "new-york-jets",
      },
      peytonManning,
    );

    expect(result).toEqual({
      valid: false,
      code: "INVALID_RELATIONSHIP",
      reason: "Peyton Manning did not play for the New York Jets.",
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
      ),
    ).toThrow(AiValidatorUnavailableError);
  });

  it("creates a direct valid explanation without additional facts", () => {
    const result = mapAiMoveDecision(
      validDecision({
        entityType: "NFL_TEAM",
        normalizedName: "Indianapolis Colts",
        canonicalTeamId: "indianapolis-colts",
      }),
      peytonManning,
    );

    expect(result).toMatchObject({
      valid: true,
      relationship: {
        summary: "Peyton Manning did play for the Indianapolis Colts.",
      },
    });
  });
});
