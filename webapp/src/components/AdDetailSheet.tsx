"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { formatAdDate, type AdDetail } from "@/lib/geo/ads";

const DEFAULT_BG = "linear-gradient(135deg,#2E86D6,#3B5BDB)";

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function AdDetailSheet({
  ad,
  open,
  onClose,
  onCta,
}: {
  ad: AdDetail | null;
  open: boolean;
  onClose: () => void;
  onCta?: (ad: AdDetail) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !ad) return null;

  const hasOffer = ad.offer_starts_at || ad.offer_ends_at;
  const cta = ad.cta_label?.trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-detail-title"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-white shadow-pop sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft"
        >
          <X size={16} />
        </button>

        <div className="overflow-y-auto px-5 pb-6 pt-2">
          <div
            className="overflow-hidden rounded-[12px]"
            style={{ aspectRatio: "2.4 / 1" }}
          >
            {ad.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.image_url}
                alt=""
                className="h-full w-full object-contain object-center"
              />
            ) : (
              <div
                className="flex h-full w-full items-end p-5 text-white"
                style={{ background: ad.background || DEFAULT_BG }}
              >
                <p className="font-display text-lg font-bold leading-snug">{ad.title}</p>
              </div>
            )}
          </div>

          <span className="mt-4 inline-flex rounded-full bg-blue-soft px-2.5 py-1 text-[11px] font-bold text-blue-deep">
            {ad.brand_name || "Sponsored"}
          </span>

          <h2 id="ad-detail-title" className="mt-2.5 font-display text-2xl font-extrabold leading-snug text-ink">
            {ad.title}
          </h2>

          {ad.body ? (
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{ad.body}</p>
          ) : null}

          {hasOffer ? (
            <div className="mt-5 rounded-[18px] border border-line bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Offer period</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex gap-3">
                  <dt className="w-12 shrink-0 font-bold text-ink-soft">Starts</dt>
                  <dd className="font-bold text-ink">{formatAdDate(ad.offer_starts_at)}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-12 shrink-0 font-bold text-ink-soft">Ends</dt>
                  <dd className="font-bold text-ink">{formatAdDate(ad.offer_ends_at)}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {cta && ad.cta_url ? (
            <div className="mt-6">
              {isExternalUrl(ad.cta_url) ? (
                <a
                  href={ad.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary block w-full text-center"
                  onClick={() => onCta?.(ad)}
                >
                  {cta}
                </a>
              ) : (
                <Link href={ad.cta_url} className="btn-primary block w-full text-center" onClick={() => onCta?.(ad)}>
                  {cta}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
