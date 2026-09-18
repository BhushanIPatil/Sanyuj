"use client";
import type { NoticeDetail } from "@/lib/geo/notices";
import { formatWhenRange } from "@/lib/formatWhen";
import { CategoryTintBadge } from "@/components/CategoryFilterRow";
export function NoticeCard({ notice, onOpen }: { notice: NoticeDetail; onOpen: (notice: NoticeDetail) => void }) {
  const when = formatWhenRange(notice.event_starts_at, notice.event_ends_at);

  return (
    <button
      type="button"
      onClick={() => onOpen(notice)}
      className="cursor-pointer overflow-hidden rounded-[16px] border border-line bg-white text-left shadow-card transition hover:border-blue-deep/30"
    >
      {notice.image_url ? (
        <div className="overflow-hidden bg-surface" style={{ aspectRatio: "2.4 / 1" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={notice.image_url} alt="" className="h-full w-full object-contain object-center" />
        </div>
      ) : null}
      <div className="p-4">
        {notice.category ? (
          <div className="mb-2">
            <CategoryTintBadge category={notice.category} />
          </div>
        ) : null}
        <h2 className="font-display text-base font-extrabold leading-snug text-ink">{notice.title}</h2>
        {notice.body ? <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-soft">{notice.body}</p> : null}
        {when ? <p className="mt-2 text-[11px] font-semibold text-ink-faint">{when}</p> : null}
      </div>
    </button>
  );
}
