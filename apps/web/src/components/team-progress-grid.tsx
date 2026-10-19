import { NFL_TEAMS } from "@nfl-chain/shared";

type TeamProgressGridProps = {
  usedTeams: Record<string, true>;
};

export function TeamProgressGrid({ usedTeams }: TeamProgressGridProps) {
  return (
    <div className="team-progress-grid" aria-label="NFL franchise progress">
      {NFL_TEAMS.map((team) => {
        const isUsed = Boolean(usedTeams[team.id]);

        return (
          <span
            className={isUsed ? "team-chip team-chip--used" : "team-chip"}
            key={team.id}
            title={team.name}
          >
            {team.abbreviation}
          </span>
        );
      })}
    </div>
  );
}
