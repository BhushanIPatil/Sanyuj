"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Ad = {
  id: string;
  brand_name: string;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  background: string | null;
};

const DEFAULT_BG = "linear-gradient(135deg,#2E86D6,#3B5BDB)";
const ADS_CONTACT = "mailto:support@sanyuj.app?subject=Banner%20ad%20on%20Sanyuj";

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function AdCard({ ad }: { ad: Ad }) {
  const style: React.CSSProperties = ad.image_url
    ? {
        backgroundImage: `linear-gradient(100deg, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0.42) 55%, rgba(15,23,42,0.2) 100%), url("${ad.image_url}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: ad.background || DEFAULT_BG };

  const inner = (
    <>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
          {ad.brand_name}
        </span>
        <span className="rounded-full bg-black/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/85">
          Ad
        </span>
      </div>
      <h3 className="mt-3 max-w-sm font-display text-lg font-bold leading-snug">{ad.title}</h3>
      {ad.body ? <p className="mt-1 max-w-md text-sm text-white/90">{ad.body}</p> : null}
      {ad.cta_label ? (
        <span className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-bold text-blue-deep">
          {ad.cta_label}
        </span>
      ) : null}
    </>
  );

  const className =
    "relative flex min-h-[148px] flex-col overflow-hidden rounded-[24px] p-5 text-white shadow-card";

  if (!ad.cta_url) {
    return (
      <div className={className} style={style}>
        {inner}
      </div>
    );
  }

  if (isExternalUrl(ad.cta_url)) {
    return (
      <a
        href={ad.cta_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} transition hover:brightness-105`}
        style={style}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={ad.cta_url} className={`${className} transition hover:brightness-105`} style={style}>
      {inner}
    </Link>
  );
}

function FeaturedCta() {
  return (
    <a
      href={ADS_CONTACT}
      className="mt-3 flex items-center gap-3 rounded-[16px] border border-line bg-surface px-3.5 py-2.5 transition hover:border-blue-deep/40"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-indigo-soft text-indigo">
        <Megaphone size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-tight">Want your business featured here?</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">
          Reach nearby customers &amp; providers with a banner ad.
        </span>
      </span>
      <span className="shrink-0 whitespace-nowrap text-xs font-bold text-blue-deep">Contact us →</span>
    </a>
  );
}

export function HomeAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [active, setActive] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("ads")
        .select("id, brand_name, title, body, cta_label, cta_url, image_url, background")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true })
        .limit(8);
      setAds((data as Ad[] | null) ?? []);
    };
    void load();
  }, []);

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
      {ads.length > 0 ? (
        <>
          <div className="md:hidden">
            <div
              ref={scrollerRef}
              onScroll={onScroll}
              className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
            >
              {ads.map((ad) => (
                <div key={ad.id} className="min-w-full shrink-0 snap-center">
                  <AdCard ad={ad} />
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
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        </>
      ) : null}

      <FeaturedCta />
    </section>
  );
}
