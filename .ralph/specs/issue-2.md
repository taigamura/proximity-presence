# Client + backend skeleton (Kaji-aligned scaffold + HTTP seam)

> GitHub issue #2 | Labels: ready-for-agent, P0 | https://github.com/taigamura/proximity-presence/issues/2

## What to build

The greenfield skeleton for both halves of the system, aligned to the `simple-bookkeeping` (Kaji) app for maintenance consistency (User Story 17).

**Client:** an Expo (React Native) + TypeScript app scaffolded with Kaji's folder taxonomy (`domain/store/nav/ui/screens/theme/i18n/platform/`), web-first dev loop, jest (jest-expo preset) + `tsc --noEmit` typecheck wired into `npm test` / `npm run typecheck`.

**Backend:** a Node/TypeScript service (User Story 19) with Postgres and an APNs client dependency stubbed, plus the HTTP seam: an endpoint accepting `{ ephemeralToken, geohash6 }` up and the shape for a silent push down. No real matching yet — just the wire contract and a health check.

This establishes the three seams named in the PRD (client ↔ backend HTTP, backend ↔ Postgres, backend ↔ APNs) as stubs so later slices fill them in.

## Acceptance criteria

- [ ] Client app boots on web and runs `npm test` (jest-expo) and `npm run typecheck` (tsc --noEmit) green
- [ ] Client folders match Kaji taxonomy: `domain/store/nav/ui/screens/theme/i18n/platform/`
- [ ] Backend is Node/TypeScript, boots, exposes a health check, and has a Postgres connection + APNs client wired (may be stubbed)
- [ ] Backend accepts `POST {ephemeralToken, geohash6}` and returns a defined response (no matching logic yet)
- [ ] Both halves have a passing test/typecheck command documented in `CONTEXT.md`

## Blocked by

- None - can start immediately

