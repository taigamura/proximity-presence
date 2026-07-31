# Proximity Presence

**A privacy-first iOS app that quietly tells you when a friend is roughly nearby (~1 km) — without revealing who, without a map, and without any chat.** Presence as weather, not as an alert: the app surfaces a single anonymized line, *"Someone you know is nearby."* The client only ever uploads a coarse geohash-6 bucket plus a rotating ephemeral token; raw coordinates never leave the device, and the server cannot link uploads to a persistent identity.

## What it can do today

- **Anonymized proximity signal** — when a friend is in the same ~1.2 km geohash bucket, you get a single calm line: *"Someone you know is nearby."* No name, no map, no count, no history.
- **Friend graph via invite links** — add friends with an invite link + shared secret. No phone-number lookup, no Contacts import.
- **Privacy by construction** — the client uploads only a geohash-6 bucket + an hourly-rotating ephemeral token. The server never receives or stores raw coordinates.
- **Ambient notification policy** — deliveries are rate-limited (~1/hour per friend), near-simultaneous matches are batched into one message, and notifications stay off until you have a minimum number of friends (so a ping can't be trivially de-anonymized).
- **Background presence detection** — significant-location-change updates keep presence working when the app is closed, with a graceful "sleeping" state if background location is denied.
- **Leave cleanly** — block/remove a friend (severs the edge), and delete all your data (GDPR/APPI right-to-erasure).
- **Launch-ready compliance** — privacy policy (`docs/privacy-policy.md`), honest purpose strings, and reporting/blocking UI.

This is an MVP build. Native iOS background location must be exercised via a dev/EAS build (Expo Go can't run background location); the web target is used for the fast dev loop.

## Repository layout

```
client/   Expo (React Native) + TypeScript iOS client
server/   Node/TypeScript backend (Express + Postgres + APNs)
spike/    Background-location gating spike (see docs/adr/001)
docs/     PRD, ADRs, privacy policy, agent docs
```

## Prerequisites

- **Node.js 20+** and **npm**
- **PostgreSQL** (for the server; a local instance is fine)
- **Xcode + an iOS device or simulator** for native background-location testing (optional for the web dev loop)

## Setup

Install dependencies for each half:

```bash
# Backend
cd server
npm install

# Client
cd ../client
npm install
```

### Server configuration

The server reads two environment variables (both have sensible local defaults):

| Variable        | Default                                          | Purpose                     |
| --------------- | ------------------------------------------------ | --------------------------- |
| `DATABASE_URL`  | `postgres://localhost:5432/proximity_presence`   | Postgres connection string  |
| `PORT`          | `3000`                                            | HTTP listen port            |

Create the database before first run (schema migrations run automatically on startup):

```bash
createdb proximity_presence
```

## Running the app

### Backend

```bash
cd server
npm run dev      # ts-node-dev with auto-reload on :3000
```

The server exposes:

| Method + path              | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `POST /location`           | Upload `{ ephemeralToken, geohash6 }`; runs matching |
| `POST /tokens`             | Rotate / fetch an ephemeral token                   |
| `POST /device-token`       | Register an APNs device token                       |
| `POST /invites`            | Create a friend invite                              |
| `POST /invites/:code/accept` | Accept an invite with the shared secret           |
| `GET  /friends`            | List friend edges                                   |
| `GET  /friends/count`      | Friend count (drives the minimum-friends gate)      |
| `DELETE /friends/:identity` | Block / remove a friend (severs the edge)          |
| `DELETE /account`          | Delete all data (GDPR/APPI)                          |

### Client

```bash
cd client
npm start        # Expo dev server — press 'w' for web, or scan for a dev build
npm run ios      # native build (required for background location)
```

Point the client at your backend via the API base URL in `client/src/platform/api.ts` (defaults to localhost).

## Verify gate (run before every commit)

```bash
# Server — 77 tests
cd server && npm test && npm run typecheck

# Client — 30 tests
cd client && npm test && npm run typecheck
```

Both `npm test` and `npm run typecheck` must exit 0 in each half before a commit lands.

## Key design decisions

- Geohash-6 (~1.2 km × 0.6 km) is the only location primitive uploaded; raw coordinates never leave the device.
- Ephemeral tokens rotate hourly; the server cannot link uploads to a persistent identity.
- Notifications are rate-limited (~1/hour per friend), batched, and gated behind a minimum-friends threshold.
- Matching is deterministic and pure (testable on fixtures); no stochastic dropping.
- iOS-first; Android deferred.

See [`docs/prd.md`](docs/prd.md) for full requirements, [`docs/adr/`](docs/adr/) for architectural decision records, [`CONTEXT.md`](CONTEXT.md) for the architecture overview, and [`docs/privacy-policy.md`](docs/privacy-policy.md) for the privacy policy.
