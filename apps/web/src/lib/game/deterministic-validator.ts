import "server-only";

import {
  NFL_TEAMS,
  type MoveValidator,
  type NflTeam,
  type NormalizedEntity,
} from "@nfl-chain/shared";

function normalizeLookupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

const franchiseAliases: Record<string, string> = {
  "phoenix-cardinals": "arizona-cardinals",
  "st-louis-cardinals": "arizona-cardinals",
  "boston-patriots": "new-england-patriots",
  "baltimore-colts": "indianapolis-colts",
  "houston-oilers": "tennessee-titans",
  "tennessee-oilers": "tennessee-titans",
  "oakland-raiders": "las-vegas-raiders",
  "los-angeles-raiders": "las-vegas-raiders",
  "san-diego-chargers": "los-angeles-chargers",
  "st-louis-rams": "los-angeles-rams",
  "washington-redskins": "washington-commanders",
  "washington-football-team": "washington-commanders",
};

const teamByLookupKey = new Map<string, NflTeam>();

const collegeAliases: Record<string, string> = {
  alabama: "Alabama",
  "university-of-alabama": "Alabama",
  auburn: "Auburn",
  "boston-college": "Boston College",
  baylor: "Baylor",
  "boise-state": "Boise State",
  byu: "BYU",
  cal: "California",
  california: "California",
  cincinnati: "Cincinnati",
  clemson: "Clemson",
  colorado: "Colorado",
  duke: "Duke",
  florida: "Florida",
  "university-of-florida": "Florida",
  "florida-state": "Florida State",
  georgia: "Georgia",
  "university-of-georgia": "Georgia",
  "georgia-tech": "Georgia Tech",
  houston: "Houston",
  iowa: "Iowa",
  "iowa-state": "Iowa State",
  kentucky: "Kentucky",
  louisville: "Louisville",
  lsu: "LSU",
  "louisiana-state": "LSU",
  maryland: "Maryland",
  miami: "Miami",
  "university-of-miami": "Miami",
  michigan: "Michigan",
  "university-of-michigan": "Michigan",
  "michigan-state": "Michigan State",
  minnesota: "Minnesota",
  mississippi: "Ole Miss",
  "ole-miss": "Ole Miss",
  "mississippi-state": "Mississippi State",
  nebraska: "Nebraska",
  "north-carolina": "North Carolina",
  unc: "North Carolina",
  "nc-state": "NC State",
  "notre-dame": "Notre Dame",
  "ohio-state": "Ohio State",
  "ohio-state-university": "Ohio State",
  oklahoma: "Oklahoma",
  "oklahoma-state": "Oklahoma State",
  oregon: "Oregon",
  "oregon-state": "Oregon State",
  "penn-state": "Penn State",
  pitt: "Pittsburgh",
  pittsburgh: "Pittsburgh",
  rutgers: "Rutgers",
  smu: "SMU",
  stanford: "Stanford",
  syracuse: "Syracuse",
  tcu: "TCU",
  tennessee: "Tennessee",
  texas: "Texas",
  "university-of-texas": "Texas",
  "texas-am": "Texas A&M",
  "texas-tech": "Texas Tech",
  ucf: "UCF",
  ucla: "UCLA",
  usc: "USC",
  "southern-california": "USC",
  "university-of-southern-california": "USC",
  utah: "Utah",
  virginia: "Virginia",
  "virginia-tech": "Virginia Tech",
  "wake-forest": "Wake Forest",
  washington: "Washington",
  "washington-state": "Washington State",
  "west-virginia": "West Virginia",
  wisconsin: "Wisconsin",
};

for (const team of NFL_TEAMS) {
  const nickname = team.name.split(" ").at(-1);
  const lookupKeys = [
    team.id,
    team.name,
    team.abbreviation,
    ...(nickname ? [nickname] : []),
  ];

  for (const key of lookupKeys) {
    teamByLookupKey.set(normalizeLookupKey(key), team);
  }
}

for (const [alias, teamId] of Object.entries(franchiseAliases)) {
  const team = NFL_TEAMS.find((candidate) => candidate.id === teamId);

  if (team) {
    teamByLookupKey.set(normalizeLookupKey(alias), team);
  }
}

function normalizeFreeTextEntity(
  type: "PLAYER" | "COLLEGE",
  name: string,
): NormalizedEntity | undefined {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  const normalizedId = normalizeLookupKey(normalizedName);

  if (!normalizedId) {
    return undefined;
  }

  return {
    id: `${type.toLowerCase()}:${normalizedId}`,
    type,
    name: normalizedName,
  };
}

function normalizeJerseyNumber(
  name: string,
): NormalizedEntity | undefined {
  const match = name.trim().match(/^#?\s*(\d{1,2})$/);

  if (!match) {
    return undefined;
  }

  const jerseyNumber = Number(match[1]);

  if (jerseyNumber < 0 || jerseyNumber > 99) {
    return undefined;
  }

  return {
    id: `jersey_number:${jerseyNumber}`,
    type: "JERSEY_NUMBER",
    name: `#${jerseyNumber}`,
  };
}

function normalizeTeam(name: string): NormalizedEntity | undefined {
  const lookupKey = normalizeLookupKey(name);
  const aliasedTeamId = franchiseAliases[lookupKey];
  const team = aliasedTeamId
    ? NFL_TEAMS.find((candidate) => candidate.id === aliasedTeamId)
    : teamByLookupKey.get(lookupKey);

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

function normalizeCollege(name: string): NormalizedEntity | undefined {
  const lookupKey = normalizeLookupKey(name);
  const knownName = collegeAliases[lookupKey];
  const looksLikeCollege =
    lookupKey.includes("university") ||
    lookupKey.includes("college") ||
    lookupKey.endsWith("-state") ||
    lookupKey.endsWith("-tech");

  if (!knownName && !looksLikeCollege) {
    return undefined;
  }

  return normalizeFreeTextEntity("COLLEGE", knownName ?? name);
}

function inferEntity(answer: string): NormalizedEntity | undefined {
  const team = normalizeTeam(answer);

  if (team) {
    return team;
  }

  const jerseyNumber = normalizeJerseyNumber(answer);

  if (jerseyNumber) {
    return jerseyNumber;
  }

  if (/^#?\s*\d+\s*$/.test(answer)) {
    return undefined;
  }

  const college = normalizeCollege(answer);

  if (college) {
    return college;
  }

  return normalizeFreeTextEntity("PLAYER", answer);
}

export const validateMove: MoveValidator = async (
  currentEntity,
  submission,
) => {
  const entity = inferEntity(submission.answer);

  if (!entity) {
    return {
      valid: false,
      code: "INVALID_ENTITY",
      reason: "Enter a recognizable player, NFL team, college, or jersey number.",
    };
  }

  return {
    valid: true,
    entity,
    relationship: currentEntity
      ? {
          kind: "DETERMINISTIC",
          summary: `${currentEntity.name} connects to ${entity.name}. Factual verification is temporarily handled by the deterministic MVP validator.`,
        }
      : undefined,
  };
};
