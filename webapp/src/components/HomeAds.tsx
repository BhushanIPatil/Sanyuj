"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdDetailSheet } from "@/components/AdDetailSheet";
import {
  AD_BANNER_RADIUS,
  AD_CAROUSEL_MS,
  fetchVisibleAds,
  type AdDetail,
} from "@/lib/geo/ads";

const DEFAULT_BG = "linear-gradient(135deg,#2E86D6,#3B5BDB)";
const HOME_BANNER_HEIGHT = "clamp(260px, 32vw, 340px)";

function AdCard({ ad, onOpen }: { ad: AdDetail; onOpen: (ad: AdDetail) => void }) {
  const hasImage = Boolean(ad.image_url?.trim());

  return (
    <button
      type="button"
      onClick={() => onOpen(ad)}
      aria-label={ad.title || ad.brand_name || "View featured offer"}
      className={`relative flex h-full w-full overflow-hidden text-left transition hover:brightness-[1.02] ${
        hasImage ? "" : "text-white"
      }`}
      style={{
        height: HOME_BANNER_HEIGHT,
        borderRadius: AD_BANNER_RADIUS,
        background: hasImage ? undefined : ad.background || DEFAULT_BG,
      }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.image_url!}
          alt=""
          className="h-full w-full object-contain object-center"
        />
      ) : (
        <div className="flex h-full w-full flex-col justify-end p-5">
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-85">{ad.brand_name}</span>
          <h3 className="mt-1 font-display text-lg font-bold leading-snug">{ad.title}</h3>
        </div>
      )}
    </button>
  );
}

export function HomeAds({
  pincode,
  localityId,
  areaId,
}: {
  pincode?: string | null;
  localityId?: string | null;
  areaId?: string | null;
}) {
  const [ads, setAds] = useState<AdDetail[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailAd, setDetailAd] = useState<AdDetail | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const looping = ads.length > 1;
  const slides = looping ? [...ads, ads[0]] : ads;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const data = await fetchVisibleAds(supabase, {
          pincode,
          localityId,
          areaId,
          homeScreenOnly: true,
          limit: 8,
        });
        if (cancelled) return;
        setAds(data);
        setActive(0);
      } catch {
        if (!cancelled) setAds([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [pincode, localityId, areaId]);

  const pageWidth = () => scrollerRef.current?.clientWidth ?? 0;

  const settleLoop = useCallback(() => {
    const el = scrollerRef.current;
    const width = pageWidth();
    if (!el || !width || ads.length < 2) return;
    const raw = Math.round(el.scrollLeft / width);
    if (raw >= ads.length) {
      el.scrollTo({ left: 0, behavior: "auto" });
      setActive(0);
      return;
    }
    setActive(raw);
  }, [ads.length]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    const width = pageWidth();
    if (!el || !width) return;
    const raw = Math.round(el.scrollLeft / width);
    if (raw >= ads.length) return;
    setActive(raw);
  }, [ads.length]);

  const openAd = (ad: AdDetail) => {
    setDetailAd(ad);
  };

  useEffect(() => {
    if (!looping) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scrollend", settleLoop);
    return () => el.removeEventListener("scrollend", settleLoop);
  }, [looping, settleLoop]);

  useEffect(() => {
    if (!looping) return;
    let wrapId: number | undefined;
    const id = window.setTimeout(() => {
      const el = scrollerRef.current;
      const width = pageWidth();
      if (!el || !width) return;
      const current = Math.round(el.scrollLeft / width);
      el.scrollTo({ left: (current + 1) * width, behavior: "smooth" });
      if (current + 1 >= ads.length) {
        wrapId = window.setTimeout(settleLoop, 450);
      }
    }, AD_CAROUSEL_MS);
    return () => {
      window.clearTimeout(id);
      if (wrapId !== undefined) window.clearTimeout(wrapId);
    };
  }, [looping, active, ads.length, settleLoop]);

  return (
    <section className="mx-auto mt-6 w-full max-w-4xl" aria-label="Featured local offers">
      {loading ? (
        <Skeleton style={{ height: HOME_BANNER_HEIGHT, borderRadius: AD_BANNER_RADIUS }} />
      ) : (
        <div className="min-w-0">
            {ads.length > 0 ? (
              <div
                className="relative overflow-hidden"
                style={{ height: HOME_BANNER_HEIGHT, borderRadius: AD_BANNER_RADIUS }}
              >
                <div
                  ref={scrollerRef}
                  onScroll={onScroll}
                  className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
                >
                  {slides.map((ad, i) => (
                    <div
                      key={i === ads.length ? `${ad.id}-loop` : ad.id}
                      className="h-full min-w-full shrink-0 snap-center"
                    >
                      <AdCard ad={ad} onOpen={openAd} />
                    </div>
                  ))}
                </div>
                {ads.length > 1 ? (
                  <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
                    {active + 1}/{ads.length}
                  </span>
                ) : null}
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-[12px] border border-dashed border-line bg-surface px-4 text-center"
                style={{ height: HOME_BANNER_HEIGHT }}
              >
                <p className="text-sm font-semibold text-ink-soft">
                  Featured offers for your area will show up here.{" "}
                  <Link href="/app/offerly" className="font-bold text-blue-deep hover:underline">
                    Browse Offerly
                  </Link>
                </p>
              </div>
            )}
        </div>
      )}

      <AdDetailSheet ad={detailAd} open={detailAd != null} onClose={() => setDetailAd(null)} />
    </section>
  );
}
