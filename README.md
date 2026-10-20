# NFL Chain

Local-first, server-authoritative multiplayer NFL connection game.

## Prerequisites

- Node.js 20.9 or newer
- pnpm 10.14.0
- Java 11 or newer for the Firebase emulators
- An OpenAI API key for factual move validation

## Local setup

```bash
pnpm install
cp .env.local.example apps/web/.env.local
```

Replace the `OPENAI_API_KEY` placeholder in `apps/web/.env.local` with a
server-only API key. Restart the Next.js process after changing environment
variables.

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
- Players can create code-gated rooms and join by room code or invite URL.
- The creator can start a game with 1–4 players.
- The server owns turn rotation, transition rules, repeat checks, team progress,
  completion, and Give Up.
- RTDB broadcasts waiting, in-progress, and ended room states to every member.
- Client writes to room state are denied by database rules; all mutations go
  through authenticated Next.js route handlers.

The AI judge infers and normalizes entity types from freeform answers, verifies
factual relationships, and returns structured decisions. Relationship checks
can use web search, while the server independently enforces room state, turns,
allowed transitions, canonical NFL franchise IDs, and no-repeat rules. Configure
the model with `OPENAI_VALIDATOR_MODEL`; it defaults to `gpt-5.6-luna`.

## Browser testing

Use a normal browser window for the creator and an incognito window or a
different browser for another player. Separate browser sessions are required so
Firebase creates separate anonymous users. Create a room, share its code, join
from the second session, and start the game from the creator's waiting room.
