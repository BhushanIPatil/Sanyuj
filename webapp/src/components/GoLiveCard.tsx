"use client";

import { useEffect, useRef, useState } from "react";
import { Info, Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import {
  LIVE_SESSION_HOURS,
  fetchActiveLiveSession,
  liveRemainingLabel,
  startLiveSession,
  stopLiveSession,
  type LiveSession,
} from "@/lib/live";

/** Tap target that explains what going live actually does. */
function GoLiveInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label="About going live"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer text-ink-faint transition hover:text-blue-deep"
      >
        <Info size={14} />
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-1/2 top-[calc(100%+8px)] z-40 w-[248px] -translate-x-1/2 rounded-[12px] bg-ink p-3 text-[11.5px] font-semibold leading-relaxed text-white shadow-pop"
        >
          Going live tells neighbours in your pincode that you can take work right now.
          <span className="mt-2 block">• You show up under Live nearby for {LIVE_SESSION_HOURS} hours</span>
          <span className="block">• Stop anytime — your listing stays visible either way</span>
        </span>
      ) : null}
    </span>
  );
}

/** One-tap "working now" switch for a provider, safe to drop on any page. */
export function GoLiveCard({
  businessId,
  pincode,
  onChanged,
  className = "",
}: {
  businessId: string;
  pincode: string | null | undefined;
  /** Called after the provider goes live or stops, so the host page can refresh. */
  onChanged?: () => void;
  className?: string;
}) {
  const { showToast } = useToast();
  // Keyed by business id so the card never shows another business's session.
  const [loaded, setLoaded] = useState<{ id: string; session: LiveSession | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await fetchActiveLiveSession(createClient(), businessId);
        if (!cancelled) setLoaded({ id: businessId, session });
      } catch {
        if (!cancelled) setLoaded({ id: businessId, session: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (loaded?.id !== businessId) return null;

  const session =
    loaded.session && new Date(loaded.session.ends_at).getTime() > now ? loaded.session : null;
  const isLive = session != null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      if (session) {
        await stopLiveSession(supabase, session.id);
        setLoaded({ id: businessId, session: null });
        showToast("You are no longer showing as live");
      } else {
        const pin = pincode?.trim();
        if (!pin) throw new Error("Add your pincode in profile before going live");
        const created = await startLiveSession(supabase, businessId, pin);
        setLoaded({ id: businessId, session: created });
        showToast(`You're live for the next ${LIVE_SESSION_HOURS} hours`);
      }
      onChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not update live status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-[16px] border-[1.5px] px-3 py-2.5 shadow-card ${
        isLive ? "border-green-deep/40 bg-green-soft" : "border-line bg-white"
      } ${className}`}
    >
      <div
        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] ${
          isLive ? "bg-green-deep text-white" : "bg-green-soft text-green-deep"
        }`}
      >
        <Radio size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={`truncate font-display text-[13px] font-extrabold ${
              isLive ? "text-green-deep" : "text-ink"
            }`}
          >
            {isLive ? `You're live${pincode ? ` in ${pincode}` : ""}` : "Available right now?"}
          </p>
          <GoLiveInfo />
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-soft">
          {isLive
            ? `${liveRemainingLabel(session.ends_at)} · neighbours nearby can call you.`
            : `Go live for ${LIVE_SESSION_HOURS}h so neighbours nearby find you first.`}
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className={`shrink-0 cursor-pointer rounded-full border-[1.5px] px-3.5 py-2 text-[12px] font-bold disabled:opacity-60 ${
          isLive
            ? "border-rose bg-white text-rose"
            : "border-green-deep bg-green-deep text-white"
        }`}
      >
        {busy ? "…" : isLive ? "Stop" : "Go live"}
      </button>
    </div>
  );
}
