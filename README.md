# NFL Chain

Local-first scaffold for a server-authoritative multiplayer NFL connection game.

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

The database rules deny all reads and writes until the authoritative room flow is implemented.
