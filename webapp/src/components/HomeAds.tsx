"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AdBannerSkeleton } from "@/components/ui/Skeleton";
import { AdDetailSheet } from "@/components/AdDetailSheet";
import {
  AD_BANNER_HEIGHT,
  AD_BANNER_RADIUS,
  AD_CAROUSEL_MS,
  fetchVisibleAds,
  recordAdClick,
  type AdDetail,
} from "@/lib/geo/ads";

const DEFAULT_BG = "linear-gradient(135deg,#2E86D6,#3B5BDB)";
const ADS_CONTACT = "mailto:support@sanyuj.app?subject=Banner%20ad%20on%20Sanyuj";

function AdCard({ ad, onOpen }: { ad: AdDetail; onOpen: (ad: AdDetail) => void }) {
  const hasImage = Boolean(ad.image_url?.trim());

  return (
    <button
      type="button"
      onClick={() => onOpen(ad)}
      className={`relative flex h-full w-full overflow-hidden text-left transition hover:brightness-[1.02] ${
        hasImage ? "" : "text-white"
      }`}
      style={{
        height: AD_BANNER_HEIGHT,
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

function FeaturedCta() {
  return (
    <a
      href={ADS_CONTACT}
      className="flex h-full items-center gap-3 px-2 py-4 text-left transition hover:opacity-80 sm:px-1"
      style={{ minHeight: AD_BANNER_HEIGHT }}
    >
      <Megaphone size={28} className="shrink-0 text-blue-deep" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-extrabold leading-snug text-ink sm:text-[15px]">
          Want your business here?
        </p>
        <p className="mt-1.5 text-xs leading-snug text-ink-soft">
          Reach neighbours nearby — get featured on Sanyuj.
        </p>
      </div>
      <ChevronDown size={22} className="shrink-0 text-blue-deep sm:hidden" strokeWidth={2.25} />
      <ChevronRight size={22} className="hidden shrink-0 text-blue-deep sm:block" strokeWidth={2.25} />
    </a>
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
        setAds(data);
        setActive(0);
      } catch {
        setAds([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
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
    void recordAdClick(ad.id);
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
    <section className="mt-6" aria-label="Brand collaborations">
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-10">
          <div className="sm:col-span-3">
            <div
              className="flex w-full animate-pulse items-center gap-3 py-4"
              style={{ minHeight: AD_BANNER_HEIGHT }}
            >
              <div className="h-8 w-8 shrink-0 rounded-full bg-line" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-36 rounded bg-line" />
                <div className="h-2.5 w-full max-w-[180px] rounded bg-line" />
              </div>
              <div className="h-5 w-5 shrink-0 rounded bg-line" />
            </div>
          </div>
          <div className="min-w-0 sm:col-span-7">
            <AdBannerSkeleton />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-10">
          <div className="sm:col-span-3">
            <FeaturedCta />
          </div>
          <div className="min-w-0 sm:col-span-7">
            {ads.length > 0 ? (
              <div
                className="relative overflow-hidden"
                style={{ height: AD_BANNER_HEIGHT, borderRadius: AD_BANNER_RADIUS }}
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
                style={{ height: AD_BANNER_HEIGHT }}
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
        </div>
      )}

      <AdDetailSheet ad={detailAd} open={detailAd != null} onClose={() => setDetailAd(null)} />
    </section>
  );
}
