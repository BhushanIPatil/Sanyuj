"use client";

import { Handshake, Pencil, Trash2 } from "lucide-react";
import { formatBudget, formatDateTime, locationLabel } from "@/lib/format";
import { jobStatusBadgeClass, jobStatusLabel } from "@/lib/status";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import type { DealInterest } from "./JobDealModal";

export type JobRow = {
  id: string;
  customer_id: string;
  category_id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  pincode: string;
  locality: string | null;
  area: string | null;
  area_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  closed_with_business_id: string | null;
  is_active: boolean;
  is_deleted: boolean;
  categories: { id: string; name: string } | null;
  profiles: { id: string; full_name: string | null; phone: string | null; email: string | null } | null;
  businesses: { id: string; name: string } | null;
  interest_count: number;
};

function urgencyLabel(value: string) {
  if (value === "today") return "Today";
  if (value === "this_week") return "This week";
  return "Flexible";
}

export function JobDetailPanel({
  job,
  interests,
  onClose,
  onEdit,
  onDeal,
  onDelete,
}: {
  job: JobRow;
  interests: DealInterest[];
  onClose: () => void;
  onEdit: () => void;
  onDeal: () => void;
  onDelete: () => void;
}) {
  return (
    <SlideOver
      title={job.title}
      subtitle={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={jobStatusBadgeClass(job.status)}>{jobStatusLabel(job.status)}</Badge>
          {job.is_deleted ? <Badge className="bg-rose-soft text-rose">Deleted</Badge> : null}
          {job.businesses ? <Badge className="bg-indigo-soft text-indigo">{job.businesses.name}</Badge> : null}
        </div>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onEdit}>
            <Pencil size={14} />
            Edit
          </button>
          <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onDeal}>
            <Handshake size={14} />
            Assign deal
          </button>
          {!job.is_deleted ? (
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
      <p className="whitespace-pre-wrap text-sm text-ink-soft">{job.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-bold text-ink-soft">Customer</dt>
          <dd className="mt-0.5">{job.profiles?.full_name || "—"}</dd>
          <dd className="text-xs text-ink-faint">{job.profiles?.phone || job.profiles?.email || ""}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Category</dt>
          <dd className="mt-0.5">{job.categories?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Location</dt>
          <dd className="mt-0.5">{locationLabel(job.pincode, job.locality, job.area)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Budget</dt>
          <dd className="mt-0.5">{formatBudget(job.budget_min, job.budget_max)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Urgency</dt>
          <dd className="mt-0.5">{urgencyLabel(job.urgency)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Posted</dt>
          <dd className="mt-0.5">{formatDateTime(job.created_at)}</dd>
        </div>
      </dl>

      <section className="mt-5">
        <h3 className="mb-2 text-sm font-bold">Interested providers ({interests.length})</h3>
        {interests.length === 0 ? (
          <p className="py-3 text-sm text-ink-faint">No providers have shown interest yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-[16px] border border-line">
            {interests.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{row.businesses?.name ?? "Provider"}</p>
                  <p className="text-xs text-ink-soft">{row.businesses?.profiles?.full_name || "—"}</p>
                  <p className="text-xs text-ink-faint">
                    {row.offered_amount != null ? `Offered ₹${row.offered_amount.toLocaleString()}` : "No offer"}
                  </p>
                </div>
                <Badge
                  className={
                    row.status === "selected"
                      ? "bg-green-soft text-green-deep"
                      : row.status === "waiting"
                        ? "bg-amber-soft text-amber"
                        : "bg-surface text-ink-soft"
                  }
                >
                  {row.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SlideOver>
  );
}
