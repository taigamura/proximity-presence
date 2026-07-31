# Privacy Policy — Proximity Presence

**Last updated: 2026-07-31**

## What we collect

Proximity Presence collects only what is necessary to tell you when a friend is nearby:

- **Coarse location bucket** — a geohash-6 string (~1.2 km × 0.6 km cell). Your precise GPS coordinates are never sent to or stored on the server.
- **Ephemeral token** — a rotating, random identifier linked to your device. Rotated hourly; expired tokens are automatically deleted.
- **Friend graph** — the set of connections you create via invite links. Stored as opaque identity IDs, not names or phone numbers.
- **APNs device token** — to deliver silent presence notifications to your device.

## What we do NOT collect

- Precise GPS coordinates
- Name, email address, or phone number
- Device identifiers (IDFA, IDFV)
- Usage analytics or crash reports

## How we use it

Location buckets are compared against your friends' buckets in real time. A match triggers one silent push notification ("someone you know is nearby"). Location data is TTL'd and expires within 1 hour; no long-term location history is stored.

## Sharing

We do not sell, rent, or share your data with third parties. The only external service is Apple Push Notification service (APNs), which receives only your device token.

## Retention

- Location buckets: deleted within 1 hour of upload.
- Ephemeral tokens: deleted within 1 hour of expiry.
- Friend graph and device token: retained until you delete your account.

## Your rights

You may delete your account and all associated data at any time from the app (Friends → Delete my data). This satisfies GDPR Article 17 and Japan APPI erasure rights. Deletion is immediate and irreversible.

## Contact

Questions? Open an issue at https://github.com/taigamura/proximity-presence/issues
