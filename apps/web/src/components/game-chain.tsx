import type { ChainEntry, RoomMember } from "@nfl-chain/shared";

const entityTypeLabels = {
  PLAYER: "Player",
  NFL_TEAM: "NFL team",
  COLLEGE: "College",
  JERSEY_NUMBER: "Jersey number",
} as const;

type GameChainProps = {
  chain: ChainEntry[];
  players: Record<string, RoomMember>;
  emptyMessage?: string;
};

export function GameChain({
  chain,
  players,
  emptyMessage = "The first move will start the chain.",
}: GameChainProps) {
  if (chain.length === 0) {
    return (
      <div className="game-chain-empty">
        <span aria-hidden="true">↗</span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ol className="game-chain" aria-label="Current chain">
      {chain.map((entry, index) => (
        <li className="game-chain__item" key={entry.entryId}>
          {index > 0 && (
            <span className="game-chain__link" aria-hidden="true">
              ⛓
            </span>
          )}
          <div
            className={`entity-card entity-card--${entry.type.toLowerCase()}`}
            title={entry.relationship?.summary}
          >
            <span>{entityTypeLabels[entry.type]}</span>
            <strong>{entry.name}</strong>
            <small>
              {players[entry.submittedByUid]?.displayName ?? "Former player"}
            </small>
            {entry.relationship?.kind === "AI" && (
              <div className="entity-card__verification">
                <span>AI verified</span>
                {entry.relationship.sources?.map((source, sourceIndex) => (
                  <a
                    href={source.url}
                    key={source.url}
                    rel="noreferrer"
                    target="_blank"
                    title={source.title}
                  >
                    {sourceIndex + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
