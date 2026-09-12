"use client";

import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ImagePreview } from "@/components/ui/ImageOrEmoji";
import type { ContentCategoryRef } from "@/lib/contentCategories";

export type ServiceRunState = "live" | "scheduled" | "ended" | "inactive" | "deleted";

export type ServiceRow = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_deleted: boolean;
  starts_at: string | null;
  ends_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  category_id: string | null;
  category: ContentCategoryRef | null;
  created_at: string;
  coverage: string;
};

export function serviceRunState(
  row: Pick<ServiceRow, "is_active" | "is_deleted" | "starts_at" | "ends_at">,
): ServiceRunState {
  if (row.is_deleted) return "deleted";
  if (!row.is_active) return "inactive";
  const now = Date.now();
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return "scheduled";
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) return "ended";
  return "live";
}

export function serviceRunStateLabel(state: ServiceRunState) {
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

export function serviceRunStateBadge(state: ServiceRunState) {
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

export function ServiceDetailPanel({
  service,
  onClose,
  onEdit,
  onDelete,
}: {
  service: ServiceRow;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const run = serviceRunState(service);

  return (
    <SlideOver
      title={service.title}
      subtitle={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={serviceRunStateBadge(run)}>{serviceRunStateLabel(run)}</Badge>
          {service.category ? <Badge className="bg-indigo-soft text-indigo">{service.category.name}</Badge> : null}
        </div>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onEdit}>
            <Pencil size={14} />
            Edit
          </button>
          {!service.is_deleted ? (
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
      {service.image_url ? (
        <div className="overflow-hidden rounded-[16px] border border-line">
          <ImagePreview src={service.image_url} alt={service.title} height={160} className="rounded-none border-0" />
        </div>
      ) : null}

      {service.body ? <p className="mt-4 text-sm leading-relaxed text-ink-soft">{service.body}</p> : null}

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Detail label="Show from" value={service.starts_at ? formatDateTime(service.starts_at) : "Anytime"} />
        <Detail label="Show until" value={service.ends_at ? formatDateTime(service.ends_at) : "No end"} />
        <Detail
          label="Available from"
          value={service.event_starts_at ? formatDateTime(service.event_starts_at) : "Not set"}
        />
        <Detail label="Available until" value={service.event_ends_at ? formatDateTime(service.event_ends_at) : "Not set"} />
        <Detail label="Category" value={service.category?.name || "Not set"} />
        <Detail label="Link label" value={service.cta_url ? service.cta_label || "Open link" : "—"} />
        <Detail label="Sort order" value={service.sort_order} />
        <Detail label="Created" value={formatDateTime(service.created_at)} />
      </dl>

      {service.cta_url ? (
        <section className="mt-5">
          <h3 className="mb-1.5 text-sm font-bold">Link</h3>
          <p className="break-all text-sm text-blue-deep">{service.cta_url}</p>
        </section>
      ) : null}

      <section className="mt-5">
        <h3 className="mb-1.5 text-sm font-bold">Coverage</h3>
        <p className="rounded-[14px] border border-line bg-surface px-3 py-2.5 text-sm text-ink-soft">{service.coverage}</p>
      </section>
    </SlideOver>
  );
}
