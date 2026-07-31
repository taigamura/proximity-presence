# proximity-presence — context

## Architecture overview

Three seams:
1. **client ↔ backend HTTP** — client POSTs `{ ephemeralToken, geohash6 }` to `POST /location`; backend returns `{ ok: true }` (stub until issue #3).
2. **backend ↔ Postgres** — stubbed; connection wired in issue #3.
3. **backend ↔ APNs** — stubbed; wired in issue #4.

## Repository layout

```
client/   Expo (React Native) + TypeScript iOS client
server/   Node/TypeScript backend (Express)
spike/    Background-location gating spike (ADR-001)
docs/     PRD, ADRs, agent docs
```

### Client folder taxonomy (Kaji-aligned)

```
client/src/
  domain/     Core types and pure logic (no React, no platform)
  store/      App state (zustand or similar)
  nav/        React Navigation setup
  ui/         Reusable presentational components
  screens/    Full-screen views
  theme/      Design tokens and theme
  i18n/       String tables and localisation helpers
  platform/   Platform-specific glue (location, push, API calls)
```

## Verify gate (run before every commit)

### Client

```bash
cd client
npm test            # jest-expo
npm run typecheck   # tsc --noEmit
```

### Server

```bash
cd server
npm test            # jest + ts-jest
npm run typecheck   # tsc --noEmit
```

Both commands must exit 0 before a commit lands.

## Key decisions

- Geohash-6 (~1.2 km × 0.6 km) is the only location primitive uploaded; raw coordinates never leave the device.
- Ephemeral tokens rotate hourly; the server cannot link uploads to a persistent identity.
- Notifications are rate-limited (~1/hour per friend) and gated behind a minimum-friends threshold (see PRD).
- iOS-first; Android deferred.

See `docs/prd.md` for full requirements and `docs/adr/` for architectural decision records.
