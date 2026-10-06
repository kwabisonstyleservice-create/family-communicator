# Home SOS and emergency location sharing

## Release gate

Do not merge/deploy this feature until migration `0015_live_sos.sql` has been applied and verified. The current coding session has no Neon connector or database credential, so the migration and database integration checks have NOT run.

1. On an isolated Neon branch, inspect `information_schema.columns` for `family.sos_alerts.location_updated_at` and `location_sharing`. Inspect `pg_policies` for `sos_family_active_read` and `sos_self_update`.
2. Apply `db/migrations/0015_live_sos.sql` if these changes are absent. It is transactional and safe to repeat; it changes neither existing alerts nor household isolation policies.
3. Run `db/tests/live_sos.sql` with a test identity permitted to SET ROLE. Test fixtures must include active child/guest members, another member of their household, and a member of a different household. All test writes roll back.
4. Test on two signed-in devices, including a child/guest sender. Tap SOS; verify the other family member sees the alert within approximately ten seconds. Verify unrelated households see nothing.
5. Grant location permission. Move/update simulated GPS and verify coordinates, timestamp, accuracy and Maps destination. Deny permission on a separate test and verify SOS still appears without a position.
6. Navigate within the app: sharing continues. Reload: sharing requires tapping the explicit resume control. Lock/close the phone: no promise of background tracking; recipients see the timestamp and a stale label after two minutes.
7. Stop sharing: coordinates are cleared, SOS remains active, and delayed updates cannot restore them. End SOS: alert disappears from active feeds. Network failures must not show false success.
8. After these checks, apply the same migration to production and merge the feature branch to deploy.

## Behaviour

- Large red SOS button on Home and Safety. A tap saves an alert immediately, without waiting for GPS permission.
- Explicit consent text describes sharing with the entire household, including guests. No location is requested before tapping SOS/resume.
- Browser geolocation watches run in AppShell to survive app navigation. Fresh changes are uploaded at most every ten seconds. Browser/OS background restrictions still apply.
- Active SOS alerts and their emergency coordinates are visible to the same household. No unrelated household access is added.
- Emergency positions are stored on the SOS record; normal location privacy preferences are not modified.
- Stop sharing and End SOS clear emergency coordinates. Last-known coordinates can remain on active alerts after closing the browser until the member explicitly stops/ends the alert.
- This is an in-app alert feed, not push/SMS/email or a call to emergency services. Family members must have the app open to receive updates. A Call 112 link remains visible.
- English and Dutch labels are included.

## Verification completed in coding workspace

- Unit tests cover coordinate validation, stale/future GPS timestamps, missing coordinates and stopped-sharing freshness.
- ESLint and Next.js production build.
- Signed-in browser/geolocation and database integration checks remain release gates, not completed tests.
