# Background-location gating spike

> GitHub issue #1 | Labels: ready-for-agent, P0 | https://github.com/taigamura/proximity-presence/issues/1

## What to build

A gating spike that proves iOS background location works reliably enough to build the whole app on. Before committing to Expo for the full product, verify that `expo-location` background updates plus `expo-task-manager` fire when the app is **killed** on a **real device** under "Always Allow" permission. The task should wake and post a coarse location bucket to a stub endpoint (or log it) to prove the trigger fires end-to-end.

This spike gates the full build (User Story 18). If the Expo background trigger is flaky, the fallback is a thin native module handling **only** the location trigger, with React Native for everything else — capture that finding.

Use significant-location-change (500m granularity, low battery), not continuous updates.

## Acceptance criteria

- [ ] On a real iOS device with "Always Allow" granted, killing the app and moving ≥500m wakes the background task
- [ ] The woken task successfully computes a geohash-6 bucket and posts it (or logs it verifiably)
- [ ] Battery impact is observed and noted (significant-location-change, not continuous)
- [ ] A written go/no-go finding is recorded: Expo trigger is reliable, OR fall back to a thin native location module
- [ ] The decision is captured as an ADR under `docs/adr/`

## Blocked by

- None - can start immediately

