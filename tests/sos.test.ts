import test from "node:test";
import assert from "node:assert/strict";
import { hasRecentLocation, isRecentPosition, sosLocationSchema, type SosAlert } from "../src/lib/sos/validation.ts";

const now = Date.parse("2026-10-06T01:00:00Z");
const position = { alertId: "123e4567-e89b-42d3-a456-426614174000", latitude: 52.37, longitude: 5.22, accuracy: 20, capturedAt: now };
const alert: SosAlert = { id: position.alertId, member_id: "member", member_name: "Test", message: null,
  latitude: position.latitude, longitude: position.longitude, accuracy_m: 20,
  location_updated_at: new Date(now).toISOString(), location_sharing: true, triggered_at: new Date(now).toISOString() };

test("SOS location accepts valid coordinates, including zero and geographical boundaries", () => {
  for (const [latitude, longitude] of [[0, 0], [-90, -180], [90, 180], [52.37, 5.22]]) {
    assert.equal(sosLocationSchema.safeParse({ ...position, latitude, longitude }).success, true);
  }
});
test("SOS rejects malformed coordinates, forged ids and impossible accuracy", () => {
  for (const patch of [{ latitude: 91 }, { longitude: -181 }, { latitude: NaN }, { latitude: Infinity },
    { latitude: "52" }, { accuracy: -1 }, { accuracy: 1000000 }, { alertId: "not-an-id" }, { capturedAt: 0 }]) {
    assert.equal(sosLocationSchema.safeParse({ ...position, ...patch }).success, false);
  }
});
test("GPS timestamps must be recent, with limited clock skew", () => {
  assert.equal(isRecentPosition(now - 120000, now), true);
  assert.equal(isRecentPosition(now - 120001, now), false);
  assert.equal(isRecentPosition(now + 30001, now), false);
  assert.equal(isRecentPosition(NaN, now), false);
});
test("stale, stopped and missing positions are never presented as recent", () => {
  assert.equal(hasRecentLocation(alert, now), true);
  assert.equal(hasRecentLocation({ ...alert, latitude: 0, longitude: 0 }, now), true);
  assert.equal(hasRecentLocation(alert, now + 120001), false);
  assert.equal(hasRecentLocation({ ...alert, location_sharing: false }, now), false);
  assert.equal(hasRecentLocation({ ...alert, latitude: null }, now), false);
  assert.equal(hasRecentLocation({ ...alert, location_updated_at: null }, now), false);
});
