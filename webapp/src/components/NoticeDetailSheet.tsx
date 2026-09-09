"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { formatNoticeDate, type NoticeDetail } from "@/lib/geo/notices";

export function NoticeDetailSheet({
  notice,
  open,
  onClose,
}: {
  notice: NoticeDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !notice) return null;

  const hasWindow = notice.starts_at || notice.ends_at;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-detail-title"
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
          {notice.image_url ? (
            <div className="overflow-hidden rounded-[12px] bg-surface" style={{ aspectRatio: "2.4 / 1" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={notice.image_url} alt="" className="h-full w-full object-contain object-center" />
            </div>
          ) : null}

          <h2
            id="notice-detail-title"
            className={`font-display text-2xl font-extrabold leading-snug text-ink ${notice.image_url ? "mt-4" : "mt-2"}`}
          >
            {notice.title}
          </h2>

          {notice.body ? <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{notice.body}</p> : null}

          {hasWindow ? (
            <div className="mt-5 rounded-[18px] border border-line bg-surface p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">When</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex gap-3">
                  <dt className="w-12 shrink-0 font-bold text-ink-soft">Starts</dt>
                  <dd className="font-bold text-ink">{formatNoticeDate(notice.starts_at)}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-12 shrink-0 font-bold text-ink-soft">Ends</dt>
                  <dd className="font-bold text-ink">{formatNoticeDate(notice.ends_at)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
