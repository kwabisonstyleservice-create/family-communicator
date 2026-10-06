import { z } from "zod";

export const sosLocationSchema = z.object({
  alertId: z.uuid(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(999999.99),
  capturedAt: z.number().int().positive(),
});
export function isRecentPosition(timestamp: number, now = Date.now()) {
  return timestamp <= now + 30_000 && timestamp >= now - 120_000;
}
export type SosAlert = {
  id: string; member_id: string; member_name: string; message: string | null;
  latitude: number | null; longitude: number | null; accuracy_m: number | null;
  location_updated_at: string | null; location_sharing: boolean; triggered_at: string;
};
export function hasRecentLocation(alert: SosAlert, now = Date.now()) {
  return alert.location_sharing && alert.latitude !== null && alert.longitude !== null
    && !!alert.location_updated_at && isRecentPosition(Date.parse(alert.location_updated_at), now);
}
