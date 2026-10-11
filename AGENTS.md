# NFL Chain: Agent Guide

Keep the MVP small, server-authoritative, and easy to test locally. Build the multiplayer game engine first; add the AI judge only after the core loop is reliable.

## Game rules

- Support 1–4 players, including solo play.
- Goal: connect all 32 NFL franchises in one continuous chain.
- Allowed entity types: `PLAYER`, `NFL_TEAM`, `COLLEGE`, and `JERSEY_NUMBER`.
- Allowed transitions:
  - `PLAYER` → `PLAYER`, `NFL_TEAM`, `COLLEGE`, or `JERSEY_NUMBER`
  - `NFL_TEAM`, `COLLEGE`, or `JERSEY_NUMBER` → `PLAYER`
- Valid relationships:
  - Player → player: they were NFL or college teammates during at least one overlapping season.
  - Player ↔ NFL team: the player was on that team's regular-season roster.
  - Player ↔ college: the player played college football there.
  - Player ↔ jersey number: the player wore that number in the NFL or college.
- Use Super Bowl-era facts only.
- An entity cannot appear more than once in a game.
- A franchise counts once across relocations or name changes.
- Invalid submissions do not change the chain or advance the turn. Retries are unlimited; there is no MVP timer or rewind.
- The game ends when all 32 teams have been used or a player chooses Give Up. Completed and given-up games are read-only.

## Architecture

- Use a small pnpm monorepo:
  - `apps/web`: Next.js + TypeScript UI and server endpoints/actions
  - `packages/shared`: shared types, rules, validation schemas, and validator contract
  - `firebase`: Realtime Database rules and emulator configuration
- Use Firebase Realtime Database for shared game state and Firebase Anonymous Auth for temporary player identity. Store a display name alongside each anonymous UID.
- Develop against the Firebase Emulator Suite first. Do not require a production Firebase project for local development.
- Rooms are private and joinable by room code or invite link.

## Authoritative move flow

Clients request moves; they do not write authoritative game state directly.

1. Receive the submitted entity.
2. Verify room status, membership, current turn, allowed transition, and no-repeat rules.
3. Call `validateMove(currentEntity, submission)`.
4. If invalid, return a structured rejection without changing state or turn.
5. If valid, atomically append the normalized entity, update used entities/team progress, and advance the turn.
6. Let RTDB broadcast the updated state to every connected client.

Keep validation behind one interface from the start. The initial fake implementation may return a structured valid result. Later, replace it with the AI judge without changing the game flow. The AI judge verifies the factual relationship and returns structured data such as validity, normalized entity identity/type, relationship, and a short reason. It advises the server; it never mutates game state.

## Room and player lifecycle

- Support room creation and joining while `WAITING`, gameplay while `IN_PROGRESS`, and a read-only `ENDED` state.
- Use `terminalReason` to distinguish a completed 32-team chain from Give Up after a room has ended.
- Keep connection presence separate from room membership so a temporary disconnect is not treated as an explicit leave.
- Allow an anonymously authenticated player to reconnect to their room.
- An explicit leave removes that player and the server updates turn ownership when needed.
- Delete the game when every player has explicitly left. Do not accept moves after completion or Give Up.

## RTDB state shape

Keep the room record simple. At a high level it should contain:

```text
rooms/{roomCode}
  status                 // WAITING | IN_PROGRESS | ENDED
  players/{uid}          // display name, join order, connection/presence
  currentTurn            // uid or join-order index
  chain                  // ordered normalized entities and relationship results
  usedEntities           // normalized IDs for fast no-repeat checks
  usedTeams              // canonical franchise IDs and progress toward 32
  createdAt / updatedAt
  terminalReason         // completion or Give Up details when applicable
```

Use canonical IDs for repeat checks, especially for renamed or relocated franchises. Protect authoritative fields with server code and Firebase security rules.

## Build order

1. Create the pnpm workspace, Next.js app, shared package, and Firebase emulator configuration.
2. Connect the app to Anonymous Auth and RTDB locally; verify a write is received by a realtime listener.
3. Implement private room creation/joining, display names, waiting-room state, and 1–4 player limits.
4. Implement server-authoritative turns, chain updates, no-repeat tracking, team progress, and terminal states using the fake `validateMove()`.
5. Implement reconnect, disconnect presence, explicit leave, and deletion when everyone leaves.
6. Test full games in multiple browser sessions, including solo and 2–4 player rooms, invalid retries, turn rotation, reconnects, leaves, completion, and Give Up.
7. Replace the fake validator with the structured AI judge and add focused validation tests.

Favor the smallest implementation that satisfies these rules. Avoid adding accounts, public matchmaking, timers, rewind, or unrelated infrastructure to the MVP.
