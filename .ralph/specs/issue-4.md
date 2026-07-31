# Client location upload: geohash-6 + ephemeral token to API

> GitHub issue #4 | Labels: ready-for-agent, P0 | https://github.com/taigamura/proximity-presence/issues/4

## What to build

The client's location-upload path, end to end: when the background task fires (from the spike, #1), the client computes its current geohash-6 cell and an ephemeral rotating token, and posts `{ ephemeralToken, geohash6 }` to the backend seam (#2). The server stores the bucket keyed to the token in a TTL'd, hourly-rotating table.

The client uploads its bucket **only** — never raw coordinates (User Story 16). This is the privacy foundation the invariant test (#7) later asserts.

## Acceptance criteria

- [ ] Client computes geohash-6 from a location fix and an ephemeral rotating token
- [ ] Client POSTs `{ephemeralToken, geohash6}` to the backend on background-task fire
- [ ] Server persists the bucket keyed to the token in a TTL'd/rotating table
- [ ] Raw coordinates are never sent over the wire — only the geohash-6 string
- [ ] Client and server tests cover the happy-path upload; typecheck green

## Blocked by

- #1
- #2

