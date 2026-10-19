import {
  NFL_TEAM_COUNT,
  type EndedRoom as EndedRoomData,
} from "@nfl-chain/shared";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { GameChain } from "@/components/game-chain";
import { TeamProgressGrid } from "@/components/team-progress-grid";

type EndedRoomProps = {
  roomCode: string;
  room: EndedRoomData;
};

export function EndedRoom({ roomCode, room }: EndedRoomProps) {
  const completed = room.terminalReason.type === "COMPLETED";
  const endedBy =
    room.terminalReason.type === "GAVE_UP"
      ? room.players[room.terminalReason.byUid]?.displayName
      : undefined;
  const usedTeamCount = Object.keys(room.usedTeams).length;

  return (
    <main className="play-shell ended-shell">
      <header className="play-topbar">
        <Link href="/" className="brand-link" aria-label="NFL Chain home">
          <BrandMark />
        </Link>
        <div className="room-code-chip">
          <span>Game code</span>
          <strong>{roomCode}</strong>
        </div>
      </header>

      <section className="end-hero">
        <span className={completed ? "end-icon" : "end-icon end-icon--muted"}>
          {completed ? "🏆" : "◆"}
        </span>
        <p className="eyebrow">Game ended</p>
        <h1>{completed ? "All 32 teams linked" : "Chain ended"}</h1>
        <p>
          {completed
            ? `The room completed the challenge in ${room.chain.length} moves.`
            : `${endedBy ?? "A player"} gave up after ${room.chain.length} moves.`}
        </p>
        <Link className="primary-link" href="/">
          Create another game
        </Link>
      </section>

      <section className="game-stats game-stats--ended">
        <div><strong>{usedTeamCount}</strong><span>Teams</span></div>
        <div><strong>{room.chain.length}</strong><span>Moves</span></div>
        <div><strong>{Object.keys(room.players).length}</strong><span>Players</span></div>
        <div><strong>{NFL_TEAM_COUNT - usedTeamCount}</strong><span>Teams left</span></div>
      </section>

      <section className="team-board">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Final franchise board</p>
            <h2>{usedTeamCount} of {NFL_TEAM_COUNT} linked</h2>
          </div>
        </div>
        <TeamProgressGrid usedTeams={room.usedTeams} />
      </section>

      <section className="chain-board chain-board--ended">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Final chain</p>
            <h2>{room.chain.length} links</h2>
          </div>
        </div>
        <GameChain
          chain={room.chain}
          players={room.players}
          emptyMessage="The game ended before the chain began."
        />
      </section>
    </main>
  );
}
