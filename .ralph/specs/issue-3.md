# Backend match engine: bucket-equality matching (pure, tested)

> GitHub issue #3 | Labels: ready-for-agent, P0 | https://github.com/taigamura/proximity-presence/issues/3

## What to build

The core backend match engine as deterministic, testable pure functions (User Story 20). Given a set of geohash-6 buckets and friend edges, compute which users have a friend in the same bucket. Match = bucket string-equality join across a user's friend edges. No neighbor-cell matching (that is an explicit later upgrade, out of scope for MVP).

The engine is pure: it takes buckets + edges as input and returns match results, with no I/O. This makes it unit-testable on fixture data, testing external behavior (given these buckets + edges, these matches result) rather than implementation.

## Acceptance criteria

- [ ] Pure function computes matches from `(buckets, friendEdges)` via bucket string-equality
- [ ] Unit tests cover: a match, no match, multiple friends in one bucket, and self-exclusion (a user never matches themselves)
- [ ] Neighbor-cell matching is explicitly NOT implemented (documented as future work)
- [ ] Engine has zero I/O — no DB, no network — and is tested purely on fixtures
- [ ] `npm test` and typecheck stay green

## Blocked by

- #2

