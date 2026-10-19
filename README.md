# NFL Chain

Local-first, server-authoritative multiplayer NFL connection game.

## Prerequisites

- Node.js 20.9 or newer
- pnpm 10.14.0
- Java 11 or newer for the Firebase emulators

## Local setup

```bash
pnpm install
cp .env.local.example apps/web/.env.local
```

Start the Firebase Auth and Realtime Database emulators:

```bash
pnpm emulators
```

In a second terminal, start Next.js:

```bash
pnpm dev
```

- Web app: http://localhost:3000
- Emulator UI: http://localhost:4000
- Health endpoint: http://localhost:3000/api/health

## Current MVP flow

- Firebase Anonymous Auth provides a temporary player identity.
- Players can create private rooms and join by room code or invite URL.
- The creator can start a game with 1–4 players.
- The server owns turn rotation, transition rules, repeat checks, team progress,
  completion, and Give Up.
- RTDB broadcasts waiting, in-progress, and ended room states to every member.
- Client writes to room state are denied by database rules; all mutations go
  through authenticated Next.js route handlers.

The current deterministic validator infers entity types from freeform answers,
normalizes entities, recognizes all 32 NFL franchises and common historical
names, and enforces structural game rules. It temporarily accepts factual
relationships between structurally valid entities. The AI judge will replace
this validator behind the same contract after the core multiplayer loop is fully
tested.

## Browser testing

Use a normal browser window for the creator and an incognito window or a
different browser for another player. Separate browser sessions are required so
Firebase creates separate anonymous users. Create a room, share its code, join
from the second session, and start the game from the creator's waiting room.
