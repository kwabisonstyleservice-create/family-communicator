"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "@/components/language-provider";
import { startSosAction, stopSosAction, updateSosLocationAction } from "@/app/sos-actions";
import { hasRecentLocation, type SosAlert } from "@/lib/sos/validation";

export function EmergencySos({ memberId }: { memberId: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pollError, setPollError] = useState(false);
  const [watching, setWatching] = useState(false);
  const [ownId, setOwnId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const refreshSequence = useRef(0);
  const watch = useRef<number | null>(null);
  const generation = useRef(0);
  const posting = useRef(false);
  const lastSent = useRef(0);
  const busyRef = useRef(false);
  const sendingId = useRef<string | null>(null);

  const clearWatch = useCallback(() => {
    generation.current += 1;
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setWatching(false);
  }, []);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const response = await fetch("/api/sos", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data: { alerts: SosAlert[] } = await response.json();
      if (sequence !== refreshSequence.current) return;
      setAlerts(data.alerts);
      setPollError(false);
      setNow(Date.now());
      const own = data.alerts.find((alert) => alert.member_id === memberId);
      setOwnId(own?.id ?? null);
      if (sendingId.current && !data.alerts.some((alert) => alert.id === sendingId.current && alert.location_sharing)) {
        clearWatch();
        sendingId.current = null;
      }
    } catch { if (sequence === refreshSequence.current) { setPollError(true); setNow(Date.now()); } }
  }, [clearWatch, memberId]);

  useEffect(() => {
    // Kept in AppShell so watching survives navigation within the app.
    const timer = window.setInterval(() => { if (!document.hidden && !busyRef.current) void refresh(); }, 10_000);
    const initial = window.setTimeout(() => void refresh(), 0);
    const visible = () => { if (!document.hidden && !busyRef.current) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(initial); clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      generation.current += 1;
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    };
  }, [refresh]);

  async function start() {
    if (busyRef.current) return;
    refreshSequence.current += 1;
    busyRef.current = true; setBusy(true); setMessage("");
    try {
      const result = await startSosAction();
      if (!result.id) { setMessage(result.error ?? "SOS could not be sent. Try again or call 112."); return; }
      setOwnId(result.id);
      await refresh();
      clearWatch();
      if (!navigator.geolocation) {
        setMessage("SOS sent. This device cannot share its location."); return;
      }
      const id = result.id;
      sendingId.current = id;
      const version = generation.current;
      lastSent.current = 0;
      setMessage("SOS sent. Waiting for location permission or a GPS position.");
      setWatching(true);
      watch.current = navigator.geolocation.watchPosition(async (position) => {
        if (version !== generation.current || posting.current || Date.now() - lastSent.current < 10_000) return;
        posting.current = true;
        lastSent.current = Date.now();
        try {
          const saved = await updateSosLocationAction({ alertId: id, latitude: position.coords.latitude,
            longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: Math.round(position.timestamp) });
          if (version === generation.current) {
            setMessage(saved.ok ? "SOS active. Your location has been shared with your family." : saved.error ?? "Location could not be shared. Your SOS remains active.");
            if (saved.ok) void refresh();
          }
        } catch {
          if (version === generation.current) setMessage("Location could not be shared. Your SOS remains active.");
        } finally { posting.current = false; }
      }, (error) => {
        if (version !== generation.current) return;
        setMessage(error.code === 1 ? "SOS sent. Location permission was denied. Allow it in your browser settings, then retry." : "SOS sent. GPS is unavailable. Waiting for a fresh position.");
        if (error.code === 1) clearWatch();
      }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 });
    } catch { setMessage("SOS could not be sent. Try again or call 112."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function stop(id: string, endEmergency: boolean) {
    if (busyRef.current) return;
    refreshSequence.current += 1;
    busyRef.current = true; setBusy(true);
    clearWatch(); sendingId.current = null;
    try {
      const result = await stopSosAction(id, endEmergency);
      setMessage(result.ok ? (endEmergency ? "SOS ended. Emergency location sharing is off." : "Location sharing stopped. Your SOS remains active.") : result.error ?? "The change could not be saved. Please try again.");
      if (result.ok) await refresh();
    } catch { setMessage("The change could not be saved. Please try again."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const showButton = pathname === "/dashboard" || pathname === "/safety";
  if (!showButton && !alerts.length && !ownId) return null;

  return <section className="emergency-panel" aria-label={t("Family emergency")}>
    {showButton && !ownId && <>
      <button type="button" className="emergency-button" onClick={() => void start()} disabled={busy}>
        <ShieldAlert size={40} aria-hidden="true" /><strong>{busy ? t("Sending SOS…") : "SOS"}</strong>
        <span>{t("Emergency — alert my family")}</span>
      </button>
      <p>{t("Tap SOS to alert your family and share your live location with everyone in your family space, including guests.")}</p>
    </>}
    {(showButton || ownId) && <p>{t("Allow location access and keep the app open. Updates can pause when your phone locks. This does not call emergency services.")} <a href="tel:112">{t("Call 112")}</a></p>}
    {ownId && <div className="emergency-controls">
      <strong>{t("Your SOS is active")}</strong>
      {!watching && <button className="button" disabled={busy} onClick={() => void start()}>{t("Share / retry live location")}</button>}
      <button className="button" disabled={busy} onClick={() => void stop(ownId, false)}>{t("Stop sharing location")}</button>
      <button className="button button-primary" disabled={busy} onClick={() => void stop(ownId, true)}>{t("I’m safe — end SOS")}</button>
    </div>}
    <p role="status" aria-live="polite">{message ? t(message) : ""}</p>
    {pollError && <p role="alert">{t("Emergency updates could not be loaded. Information may be out of date.")}</p>}
    {alerts.length > 0 && <div aria-live="polite">{alerts.map((alert) => <article className="emergency-alert" key={alert.id}>
      <h2><ShieldAlert size={22} aria-hidden="true" /> SOS · {alert.member_name}</h2>
      {alert.message && <p>{alert.message}</p>}
      {alert.latitude !== null && alert.longitude !== null ? <>
        <p>{t(hasRecentLocation(alert, now) && !pollError ? "Recent location update" : "Last known location — updates may have stopped")}</p>
        {alert.location_updated_at && <p>{t("Location recorded at")} <time dateTime={alert.location_updated_at}>{new Intl.DateTimeFormat(t.locale === "nl" ? "nl-NL" : "en-GB", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Amsterdam" }).format(new Date(alert.location_updated_at))}</time>{alert.accuracy_m !== null ? ` · ±${Math.round(alert.accuracy_m)} m` : ""}</p>}
        <a className="button" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`}>{t("Open location in Maps")}</a>
      </> : <p>{t("No location shared yet. The SOS is still active.")}</p>}
    </article>)}</div>}
  </section>;
}
