"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AdBannerSkeleton } from "@/components/ui/Skeleton";
import { AdDetailSheet } from "@/components/AdDetailSheet";
import {
  AD_BANNER_HEIGHT,
  AD_BANNER_RADIUS,
  AD_CAROUSEL_MS,
  fetchCoveringAdIds,
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
      className="flex h-full flex-col items-center justify-center gap-3 px-3 py-4 text-center transition hover:opacity-80"
      style={{ minHeight: AD_BANNER_HEIGHT }}
    >
      <Megaphone size={28} className="text-blue-deep" strokeWidth={1.75} />
      <div>
        <p className="font-display text-sm font-extrabold leading-snug text-ink sm:text-[15px]">
          Want your business here?
        </p>
        <p className="mt-1.5 text-xs leading-snug text-ink-soft">
          Reach neighbours nearby — get featured on Sanyuj.
        </p>
      </div>
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const covering = await fetchCoveringAdIds(supabase, { pincode, localityId, areaId });
        if (!covering.length) {
          setAds([]);
          return;
        }
        const { data } = await supabase
          .from("ads")
          .select(
            "id, brand_name, title, body, cta_label, cta_url, image_url, background, offer_starts_at, offer_ends_at",
          )
          .eq("is_active", true)
          .eq("is_deleted", false)
          .in("id", covering)
          .order("sort_order", { ascending: true })
          .limit(8);
        setAds((data as AdDetail[] | null) ?? []);
        setActive(0);
      } catch {
        setAds([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [pincode, localityId, areaId]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const openAd = (ad: AdDetail) => {
    void recordAdClick(ad.id);
    setDetailAd(ad);
  };

  useEffect(() => {
    if (ads.length < 2) return;
    const id = window.setTimeout(() => {
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      const next = (current + 1) % ads.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, AD_CAROUSEL_MS);
    return () => window.clearTimeout(id);
  }, [ads.length, active]);

  return (
    <section className="mt-6" aria-label="Brand collaborations">
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-10">
          <div className="flex sm:col-span-3 sm:items-center sm:justify-center">
            <div
              className="mx-auto w-full max-w-[160px] animate-pulse space-y-3 py-6"
              style={{ minHeight: AD_BANNER_HEIGHT }}
            >
              <div className="mx-auto h-8 w-8 rounded-full bg-line" />
              <div className="mx-auto h-3 w-28 rounded bg-line" />
              <div className="mx-auto h-2.5 w-36 rounded bg-line" />
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
                  {ads.map((ad) => (
                    <div key={ad.id} className="h-full min-w-full shrink-0 snap-center">
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
                  Featured offers for your area will show up here.
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
