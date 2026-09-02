"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AdBannerSkeleton } from "@/components/ui/Skeleton";
import { AdDetailSheet } from "@/components/AdDetailSheet";
import {
  AD_BANNER_HEIGHT,
  AD_BANNER_RADIUS,
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
      className={`relative flex w-full overflow-hidden bg-surface text-left shadow-card transition hover:brightness-[1.02] ${
        hasImage ? "" : "text-white"
      }`}
      style={{
        minHeight: AD_BANNER_HEIGHT,
        borderRadius: AD_BANNER_RADIUS,
        background: hasImage ? undefined : ad.background || DEFAULT_BG,
      }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ad.image_url!}
          alt=""
          className="h-full max-h-[148px] w-full object-contain object-center"
          style={{ minHeight: AD_BANNER_HEIGHT }}
        />
      ) : (
        <div className="flex min-h-[148px] w-full flex-col justify-end p-5">
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
      className="mt-3 flex h-11 items-center gap-2.5 rounded-full border border-line bg-surface px-4 transition hover:border-blue-deep/40"
    >
      <Megaphone size={14} className="shrink-0 text-blue-deep" />
      <span className="min-w-0 flex-1 truncate text-sm font-bold">Want your business featured here?</span>
      <span className="shrink-0 whitespace-nowrap text-xs font-bold text-blue-deep">Contact →</span>
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

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };

  const openAd = (ad: AdDetail) => {
    void recordAdClick(ad.id);
    setDetailAd(ad);
  };

  useEffect(() => {
    if (ads.length < 2) return;
    const id = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      const next = (current + 1) % ads.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 5500);
    return () => window.clearInterval(id);
  }, [ads.length]);

  return (
    <section className="mt-6" aria-label="Brand collaborations">
      {loading ? (
        <AdBannerSkeleton />
      ) : ads.length > 0 ? (
        <>
          <div className="md:hidden">
            <div
              ref={scrollerRef}
              onScroll={onScroll}
              className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
            >
              {ads.map((ad) => (
                <div key={ad.id} className="min-w-full shrink-0 snap-center bg-surface">
                  <AdCard ad={ad} onOpen={openAd} />
                </div>
              ))}
            </div>
            {ads.length > 1 ? (
              <div className="mt-2.5 flex items-center justify-center gap-1.5">
                {ads.map((ad, i) => (
                  <button
                    key={ad.id}
                    type="button"
                    aria-label={`Show ad ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition ${
                      i === active ? "w-5 bg-blue-deep" : "w-1.5 bg-line"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className={ads.length === 1 ? "hidden md:block" : "hidden gap-4 md:grid md:grid-cols-2"}>
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} onOpen={openAd} />
            ))}
          </div>
        </>
      ) : null}

      <FeaturedCta />

      <AdDetailSheet ad={detailAd} open={detailAd != null} onClose={() => setDetailAd(null)} />
    </section>
  );
}
