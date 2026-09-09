"use client";

import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ImagePreview } from "@/components/ui/ImageOrEmoji";

export type NoticeRunState = "live" | "scheduled" | "ended" | "inactive" | "deleted";

export type NoticeRow = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_deleted: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  coverage: string;
};

export function noticeRunState(
  row: Pick<NoticeRow, "is_active" | "is_deleted" | "starts_at" | "ends_at">,
): NoticeRunState {
  if (row.is_deleted) return "deleted";
  if (!row.is_active) return "inactive";
  const now = Date.now();
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return "scheduled";
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) return "ended";
  return "live";
}

export function noticeRunStateLabel(state: NoticeRunState) {
  switch (state) {
    case "live":
      return "Live";
    case "scheduled":
      return "Scheduled";
    case "ended":
      return "Ended";
    case "inactive":
      return "Inactive";
    case "deleted":
      return "Deleted";
  }
}

export function noticeRunStateBadge(state: NoticeRunState) {
  switch (state) {
    case "live":
      return "bg-green-soft text-green-deep";
    case "scheduled":
      return "bg-blue-soft text-blue-deep";
    case "ended":
      return "bg-surface text-ink-soft";
    case "inactive":
      return "bg-amber-soft text-amber";
    case "deleted":
      return "bg-rose-soft text-rose";
  }
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export function NoticeDetailPanel({
  notice,
  onClose,
  onEdit,
  onDelete,
}: {
  notice: NoticeRow;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const run = noticeRunState(notice);

  return (
    <SlideOver
      title={notice.title}
      subtitle={<Badge className={noticeRunStateBadge(run)}>{noticeRunStateLabel(run)}</Badge>}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onEdit}>
            <Pencil size={14} />
            Edit
          </button>
          {!notice.is_deleted ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[18px] border border-rose/30 bg-rose-soft px-3 py-2 text-sm font-bold text-rose"
              onClick={onDelete}
            >
              <Trash2 size={14} />
              Delete
            </button>
          ) : null}
        </div>
      }
    >
      {notice.image_url ? (
        <div className="overflow-hidden rounded-[16px] border border-line">
          <ImagePreview src={notice.image_url} alt={notice.title} height={160} className="rounded-none border-0" />
        </div>
      ) : null}

      {notice.body ? <p className="mt-4 text-sm leading-relaxed text-ink-soft">{notice.body}</p> : null}

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Detail label="Starts" value={notice.starts_at ? formatDateTime(notice.starts_at) : "Anytime"} />
        <Detail label="Ends" value={notice.ends_at ? formatDateTime(notice.ends_at) : "No end"} />
        <Detail label="Sort order" value={notice.sort_order} />
        <Detail label="Created" value={formatDateTime(notice.created_at)} />
      </dl>

      <section className="mt-5">
        <h3 className="mb-1.5 text-sm font-bold">Coverage</h3>
        <p className="rounded-[14px] border border-line bg-surface px-3 py-2.5 text-sm text-ink-soft">{notice.coverage}</p>
      </section>
    </SlideOver>
  );
}
