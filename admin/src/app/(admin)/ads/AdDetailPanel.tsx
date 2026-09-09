"use client";

import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { ImagePreview } from "@/components/ui/ImageOrEmoji";

export type AdPaymentStatus = "paid" | "unpaid";

export type AdRunState = "live" | "scheduled" | "ended" | "inactive" | "deleted";

export type AdRow = {
  id: string;
  brand_name: string;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  background: string;
  sort_order: number;
  is_active: boolean;
  is_deleted: boolean;
  starts_at: string | null;
  ends_at: string | null;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
  price: number | null;
  payment_status: AdPaymentStatus;
  is_home_screen: boolean;
  created_at: string;
  coverage: string;
  totalClicks: number;
  uniqueUsers: number;
};

export function adRunState(ad: Pick<AdRow, "is_active" | "is_deleted" | "starts_at" | "ends_at">): AdRunState {
  if (ad.is_deleted) return "deleted";
  if (!ad.is_active) return "inactive";
  const now = Date.now();
  if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return "scheduled";
  if (ad.ends_at && new Date(ad.ends_at).getTime() <= now) return "ended";
  return "live";
}

export function adRunStateLabel(state: AdRunState) {
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

export function adRunStateBadge(state: AdRunState) {
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

export function paymentBadge(status: AdPaymentStatus) {
  return status === "paid" ? "bg-green-soft text-green-deep" : "bg-amber-soft text-amber";
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export function AdDetailPanel({
  ad,
  onClose,
  onEdit,
  onDelete,
}: {
  ad: AdRow;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const run = adRunState(ad);

  return (
    <SlideOver
      title={ad.brand_name}
      subtitle={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={adRunStateBadge(run)}>{adRunStateLabel(run)}</Badge>
          <Badge className={paymentBadge(ad.payment_status)}>
            {ad.payment_status === "paid" ? "Paid" : "Unpaid"}
          </Badge>
          <Badge className={ad.is_home_screen ? "bg-blue-soft text-blue-deep" : "bg-surface text-ink-soft"}>
            {ad.is_home_screen ? "Home + Offerly" : "Offerly only"}
          </Badge>
        </div>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onEdit}>
            <Pencil size={14} />
            Edit
          </button>
          {!ad.is_deleted ? (
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
      <div
        className="overflow-hidden rounded-[16px] border border-line"
        style={{ background: ad.background || "linear-gradient(135deg,#2E86D6,#3B5BDB)" }}
      >
        {ad.image_url ? (
          <ImagePreview src={ad.image_url} alt={ad.brand_name} height={160} className="rounded-none border-0" />
        ) : null}
        <div className="p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{ad.brand_name}</p>
          <h3 className="mt-1 font-display text-lg font-extrabold">{ad.title}</h3>
          {ad.body ? <p className="mt-1.5 text-sm leading-relaxed opacity-90">{ad.body}</p> : null}
          {ad.cta_label ? (
            <span className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold">{ad.cta_label}</span>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Detail label="Price" value={<span className="font-semibold">{formatMoney(ad.price)}</span>} />
        <Detail
          label="Payment"
          value={
            <Badge className={paymentBadge(ad.payment_status)}>
              {ad.payment_status === "paid" ? "Paid" : "Unpaid"}
            </Badge>
          }
        />
        <Detail label="Clicks" value={`${ad.totalClicks.toLocaleString()} total`} />
        <Detail
          label="Unique users"
          value={`${ad.uniqueUsers.toLocaleString()} user${ad.uniqueUsers === 1 ? "" : "s"}`}
        />
        <Detail label="Banner starts" value={ad.starts_at ? formatDateTime(ad.starts_at) : "Anytime"} />
        <Detail label="Banner ends" value={ad.ends_at ? formatDateTime(ad.ends_at) : "No end"} />
        <Detail label="Offer starts" value={ad.offer_starts_at ? formatDateTime(ad.offer_starts_at) : "Not set"} />
        <Detail label="Offer ends" value={ad.offer_ends_at ? formatDateTime(ad.offer_ends_at) : "Not set"} />
        <Detail label="Home screen" value={ad.is_home_screen ? "Yes — carousel + Offerly" : "Offerly only"} />
        <Detail label="Sort order" value={ad.sort_order} />
        <Detail label="Created" value={formatDateTime(ad.created_at)} />
      </dl>

      <section className="mt-5">
        <h3 className="mb-1.5 text-sm font-bold">Coverage</h3>
        <p className="rounded-[14px] border border-line bg-surface px-3 py-2.5 text-sm text-ink-soft">{ad.coverage}</p>
      </section>

      {ad.cta_url ? (
        <section className="mt-5">
          <h3 className="mb-1.5 text-sm font-bold">Call to action</h3>
          <p className="break-all text-sm text-blue-deep">{ad.cta_url}</p>
        </section>
      ) : null}
    </SlideOver>
  );
}
