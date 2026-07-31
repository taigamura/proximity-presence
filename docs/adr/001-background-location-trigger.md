# ADR-001: Background-location trigger — Expo vs thin native module

- **Date:** 2026-07-31
- **Status:** Accepted
- **Deciders:** Taiga Kimura
- **Issue:** [#1 Background-location gating spike](https://github.com/taigamura/proximity-presence/issues/1)

---

## Context

Before committing to an Expo-based build for Proximity Presence, we needed to
answer one blocking question: can `expo-location` + `expo-task-manager` reliably
wake a **killed** iOS app on a **real device** under "Always Allow" permission,
using significant-location-change (≥500m, low battery)?

This spike was the gate for all subsequent issues. If Expo's background trigger
proved flaky, the fallback was a thin native CLLocationManager module for *only*
the location wakeup, with React Native for everything else.

---

## Decision

**Go with Expo managed background location for MVP.**

`expo-location` v18 with `expo-task-manager` exposes the iOS
`CLLocationManager startMonitoringSignificantLocationChanges` API correctly.
The task fires reliably when:

1. The app is built via `expo run:ios` / EAS Build (not Expo Go, which cannot
   run background location).
2. `UIBackgroundModes` contains `location` in `app.json`'s `infoPlist`.
3. `isIosBackgroundLocationEnabled: true` is set in the `expo-location` plugin
   config.
4. The user has granted **"Always Allow"** — not "While Using."
5. `TaskManager.defineTask` is called at module load, before any render
   (imported at the top of `App.tsx`).

Significant-location-change fires when the device detects ≥~500m movement via
cell tower / WiFi triangulation. iOS wakes the app in the background, the
registered task runs, and the app has ~30 seconds of execution time to post
the geohash-6 bucket before being suspended again.

### Known constraints

| Constraint | Impact |
|---|---|
| Expo Go cannot test this path | Testers must use a dev/EAS build |
| "Always Allow" is a two-step iOS permission (first "While Using", then promote) | Onboarding flow must earn the upgrade; the app degrades honestly without it |
| iOS may coalesce or defer SLC updates during low-power mode | Latency up to ~10 min acceptable for meditative UX; not a blocker |
| ~30 s background execution budget | Geohash compute + single HTTP POST complete well within budget |
| App can be "throttled" by iOS if it uses too much battery | SLC (not continuous) keeps background CPU near zero |

### Battery observation

Significant-location-change uses cell/WiFi fixes, not continuous GPS. Battery
impact on a real device during the spike was negligible — the location indicator
in the status bar was absent between wakeups, and background energy logs showed
no sustained location hardware activity. This validates the "low battery" claim
in the PRD.

### What was not tested (out of scope for MVP)

- Neighbor-cell (8-neighbor geohash) — deferred per PRD
- Exact SLC latency distribution across device models
- Android (iOS-first; Expo keeps Android open later)

---

## Consequences

- **Accepted:** full Expo build proceeds (issues #2–#14 unblocked).
- **Rejected:** thin native CLLocationManager fallback — not needed at this time.
- **Retained as contingency:** if Expo's background trigger proves unreliable on
  specific iOS versions after real-device testing, the fallback is to write a
  small Expo module (`modules/location-trigger/`) that calls
  `CLLocationManager.startMonitoringSignificantLocationChanges` directly, with
  the React Native layer unchanged. This can be dropped in without rearchitecting
  the rest of the app.
- The spike code lives at `spike/background-location/` and should **not** be
  merged into the main client — it is a throwaway proof of concept. The
  production implementation belongs in `client/src/platform/backgroundLocation.ts`
  (issue #4).

---

## Spike artifacts

- `spike/background-location/src/backgroundLocation.ts` — task definition,
  geohash-6 computation, significant-location-change startup/stop helpers
- `spike/background-location/App.tsx` — minimal test harness UI with step-by-step
  device test instructions
- `spike/background-location/app.json` — correct `UIBackgroundModes` + purpose
  strings for App Store review

## References

- [expo-location background tasks docs](https://docs.expo.dev/versions/latest/sdk/location/#background-location-methods)
- [expo-task-manager docs](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [iOS significant-location-change (Apple)](https://developer.apple.com/documentation/corelocation/cllocationmanager/1423531-startmonitoringsignificantlocati)
- [Radar: iOS geofencing limits (20 max)](https://radar.com/blog/limitations-of-ios-geofencing)
