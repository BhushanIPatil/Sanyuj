"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatBudget, formatDateTime, initials, locationLabel } from "@/lib/format";
import { accountStatusBadge, accountStatusLabel, jobStatusBadgeClass, jobStatusLabel } from "@/lib/status";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";
import { KeyRound, Pencil, RotateCcw, Trash2 } from "lucide-react";

export type UserBusiness = {
  id: string;
  owner_id: string;
  name: string;
  rating: number;
  jobs_done: number;
  is_active: boolean;
  is_deleted: boolean;
  categories: { name: string } | null;
};

export type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  pincode: string | null;
  locality: string | null;
  area: string | null;
  address: string | null;
  onboarding_complete: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  business: UserBusiness | null;
  jobsPosted: number;
  openJobs: number;
  closedJobs: number;
};

type JobDetail = {
  id: string;
  title: string;
  status: string;
  pincode: string;
  locality: string | null;
  area: string | null;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  closed_with_business_id: string | null;
  is_active: boolean;
  is_deleted: boolean;
  categories: { name: string } | null;
  businesses: { name: string } | null;
};

type InterestDetail = {
  id: string;
  status: string;
  offered_amount: number | null;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    status: string;
    closed_with_business_id: string | null;
    categories: { name: string } | null;
    profiles: { full_name: string | null; phone: string | null } | null;
  } | null;
};

function interestLabel(status: string, jobStatus: string | undefined, closedWith: string | null, businessId: string) {
  if (jobStatus === "closed" && closedWith === businessId) return "Won deal";
  if (jobStatus === "closed") return "Lost / closed";
  if (status === "withdrawn") return "Withdrawn";
  if (status === "selected") return "Selected";
  if (status === "waiting") return "Waiting";
  return status;
}

function interestBadge(status: string, jobStatus: string | undefined, closedWith: string | null, businessId: string) {
  if (jobStatus === "closed" && closedWith === businessId) return "bg-green-soft text-green-deep";
  if (jobStatus === "closed") return "bg-surface text-ink-soft";
  if (status === "withdrawn") return "bg-rose-soft text-rose";
  if (status === "selected") return "bg-indigo-soft text-indigo";
  return "bg-amber-soft text-amber";
}

function JobList({ jobs, empty }: { jobs: JobDetail[]; empty: string }) {
  if (!jobs.length) {
    return <p className="py-3 text-sm text-ink-faint">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-line rounded-[16px] border border-line">
      {jobs.map((job) => (
        <li key={job.id} className="px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{job.title}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {job.categories?.name ?? "—"} · {locationLabel(job.pincode, job.locality, job.area)}
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                {formatBudget(job.budget_min, job.budget_max)} · {formatDateTime(job.created_at)}
              </p>
              {job.status === "closed" && job.businesses ? (
                <p className="mt-0.5 text-xs text-ink-soft">Closed with {job.businesses.name}</p>
              ) : null}
            </div>
            <Badge className={jobStatusBadgeClass(job.status)}>{jobStatusLabel(job.status)}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function UserDetailPanel({
  user,
  onClose,
  onEdit,
  onPassword,
  onDelete,
  onRestore,
}: {
  user: UserRow;
  onClose: () => void;
  onEdit: () => void;
  onPassword: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [posted, setPosted] = useState<JobDetail[]>([]);
  const [interests, setInterests] = useState<InterestDetail[]>([]);
  const [wonDeals, setWonDeals] = useState<JobDetail[]>([]);
  const [liveNow, setLiveNow] = useState(false);
  const [jobTab, setJobTab] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const jobSelect =
        "id, title, status, pincode, locality, area, budget_min, budget_max, created_at, closed_with_business_id, is_active, is_deleted, categories(name), businesses(name)";

      const { data: jobsData } = await supabase
        .from("jobs")
        .select(jobSelect)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      let interestRows: InterestDetail[] = [];
      let dealRows: JobDetail[] = [];
      let isLive = false;

      if (user.business) {
        const [interestsRes, dealsRes, liveRes] = await Promise.all([
          supabase
            .from("job_interests")
            .select(
              "id, status, offered_amount, created_at, jobs(id, title, status, closed_with_business_id, categories(name), profiles(full_name, phone))",
            )
            .eq("business_id", user.business.id)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("jobs")
            .select(jobSelect)
            .eq("closed_with_business_id", user.business.id)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("live_sessions")
            .select("id")
            .eq("business_id", user.business.id)
            .eq("is_active", true)
            .eq("is_deleted", false)
            .limit(1),
        ]);
        interestRows = (interestsRes.data as unknown as InterestDetail[]) ?? [];
        dealRows = (dealsRes.data as unknown as JobDetail[]) ?? [];
        isLive = ((liveRes.data as { id: string }[] | null) ?? []).length > 0;
      }

      if (cancelled) return;

      setPosted((jobsData as unknown as JobDetail[]) ?? []);
      setInterests(interestRows);
      setWonDeals(dealRows);
      setLiveNow(isLive);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user.id, user.business?.id]);

  const openJobs = posted.filter((j) => j.status === "open");
  const closedJobs = posted.filter((j) => j.status === "closed");
  const waitingInterests = interests.filter(
    (i) => i.status === "waiting" && i.jobs?.status !== "closed",
  );
  const bizId = user.business?.id ?? "";

  return (
    <SlideOver
      title={user.full_name || "Unnamed user"}
      subtitle={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            className={
              user.business ? "bg-indigo-soft text-indigo" : "bg-surface text-ink-soft"
            }
          >
            {user.business ? "Provider" : "Customer"}
          </Badge>
          <Badge className={accountStatusBadge(user.is_active, user.is_deleted)}>
            {accountStatusLabel(user.is_active, user.is_deleted)}
          </Badge>
          {liveNow ? <Badge className="bg-teal-soft text-teal">Live now</Badge> : null}
        </div>
      }
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onEdit}>
            <Pencil size={14} />
            Edit
          </button>
          <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onPassword}>
            <KeyRound size={14} />
            Password
          </button>
          {user.is_deleted ? (
            <button type="button" className="btn-secondary inline-flex w-auto items-center gap-1.5 py-2 text-sm" onClick={onRestore}>
              <RotateCcw size={14} />
              Restore
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[18px] border border-rose/30 bg-rose-soft px-3 py-2 text-sm font-bold text-rose"
              onClick={onDelete}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-3 rounded-[16px] border border-line bg-surface/60 p-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-soft text-sm font-bold text-blue-deep">
          {initials(user.full_name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.email || "No email"}</p>
          <p className="text-xs text-ink-soft">{user.phone || "No phone"}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-bold text-ink-soft">Location</dt>
          <dd className="mt-0.5">{locationLabel(user.pincode, user.locality, user.area)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Onboarded</dt>
          <dd className="mt-0.5">{user.onboarding_complete ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Joined</dt>
          <dd className="mt-0.5">{formatDateTime(user.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Updated</dt>
          <dd className="mt-0.5">{formatDateTime(user.updated_at)}</dd>
        </div>
        {user.address ? (
          <div className="col-span-2">
            <dt className="text-xs font-bold text-ink-soft">Address</dt>
            <dd className="mt-0.5">{user.address}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["Posted", posted.length],
          ["Open", openJobs.length],
          ["Closed", closedJobs.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[14px] border border-line bg-white px-3 py-2.5 text-center">
            <p className="font-display text-lg font-extrabold">{loading ? "—" : value}</p>
            <p className="text-[11px] font-semibold text-ink-soft">{label}</p>
          </div>
        ))}
      </div>

      {user.business ? (
        <section className="mt-5 rounded-[16px] border border-line p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Business</p>
          <p className="mt-1 font-semibold">{user.business.name}</p>
          <p className="text-xs text-ink-soft">
            {user.business.categories?.name ?? "—"} · {Number(user.business.rating).toFixed(1)}★ ·{" "}
            {user.business.jobs_done} jobs done
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            Business {accountStatusLabel(user.business.is_active, user.business.is_deleted)}
          </p>
        </section>
      ) : null}

      {loading ? (
        <div className="mt-5 space-y-3">
          <SkeletonLine width="7rem" className="h-4" />
          <Skeleton className="h-24 w-full rounded-[16px]" />
          <Skeleton className="h-24 w-full rounded-[16px]" />
        </div>
      ) : (
        <>
          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Job posts</h3>
              <div className="flex rounded-full bg-surface p-0.5">
                {(
                  [
                    ["all", `All (${posted.length})`],
                    ["open", `Open (${openJobs.length})`],
                    ["closed", `Closed (${closedJobs.length})`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      jobTab === id ? "bg-white text-ink shadow-card" : "text-ink-soft"
                    }`}
                    onClick={() => setJobTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <JobList
              jobs={jobTab === "open" ? openJobs : jobTab === "closed" ? closedJobs : posted}
              empty={
                jobTab === "open"
                  ? "No open jobs."
                  : jobTab === "closed"
                    ? "No closed jobs."
                    : "This user has not posted any jobs."
              }
            />
          </section>

          {user.business ? (
            <>
              <section className="mt-5">
                <h3 className="mb-2 text-sm font-bold">
                  Interests ({interests.length}
                  {waitingInterests.length ? ` · ${waitingInterests.length} waiting` : ""})
                </h3>
                {interests.length === 0 ? (
                  <p className="py-3 text-sm text-ink-faint">No interests yet.</p>
                ) : (
                  <ul className="divide-y divide-line rounded-[16px] border border-line">
                    {interests.map((row) => (
                      <li key={row.id} className="px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{row.jobs?.title ?? "Job"}</p>
                            <p className="mt-0.5 text-xs text-ink-soft">
                              {row.jobs?.profiles?.full_name || "Customer"} ·{" "}
                              {row.jobs?.categories?.name ?? "—"}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-faint">
                              {row.offered_amount != null
                                ? `Offered ₹${row.offered_amount.toLocaleString()}`
                                : "No offer amount"}{" "}
                              · {formatDateTime(row.created_at)}
                            </p>
                          </div>
                          <Badge
                            className={interestBadge(
                              row.status,
                              row.jobs?.status,
                              row.jobs?.closed_with_business_id ?? null,
                              bizId,
                            )}
                          >
                            {interestLabel(
                              row.status,
                              row.jobs?.status,
                              row.jobs?.closed_with_business_id ?? null,
                              bizId,
                            )}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="mt-5 pb-4">
                <h3 className="mb-2 text-sm font-bold">Deals closed with this provider ({wonDeals.length})</h3>
                <JobList jobs={wonDeals} empty="No jobs were closed with this provider." />
              </section>
            </>
          ) : null}
        </>
      )}
    </SlideOver>
  );
}
