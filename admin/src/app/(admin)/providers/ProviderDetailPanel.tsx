"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatBudget, formatDateTime, initials, locationLabel } from "@/lib/format";
import { accountStatusBadge, accountStatusLabel, jobStatusBadgeClass, jobStatusLabel } from "@/lib/status";
import { Badge } from "@/components/ui/Badge";
import { SlideOver } from "@/components/ui/SlideOver";
import { Skeleton, SkeletonLine } from "@/components/ui/Skeleton";

export type ProviderProfile = {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  pincode: string | null;
  locality: string | null;
  area: string | null;
};

export type ProviderRow = {
  id: string;
  owner_id: string;
  name: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  categories: { name: string; slug: string } | null;
  profiles: ProviderProfile | null;
  coverage: string;
  interests: number;
  waiting: number;
  closedDeals: number;
  liveNow: boolean;
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
  categories: { name: string } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
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
    pincode: string;
    locality: string | null;
    area: string | null;
    closed_with_business_id: string | null;
    categories: { name: string } | null;
    profiles: { full_name: string | null; phone: string | null } | null;
  } | null;
};

type LiveSession = {
  id: string;
  pincode: string;
  started_at: string;
  ends_at: string;
  is_active: boolean;
  is_deleted: boolean;
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
                {job.profiles?.full_name || "Customer"}
                {job.profiles?.phone ? ` · ${job.profiles.phone}` : ""} · {formatBudget(job.budget_min, job.budget_max)}
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">{formatDateTime(job.created_at)}</p>
            </div>
            <Badge className={jobStatusBadgeClass(job.status)}>{jobStatusLabel(job.status)}</Badge>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProviderDetailPanel({
  provider,
  onClose,
}: {
  provider: ProviderRow;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [interests, setInterests] = useState<InterestDetail[]>([]);
  const [closedJobs, setClosedJobs] = useState<JobDetail[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [interestTab, setInterestTab] = useState<"all" | "waiting" | "won" | "lost">("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const [interestsRes, dealsRes, liveRes] = await Promise.all([
        supabase
          .from("job_interests")
          .select(
            "id, status, offered_amount, created_at, jobs(id, title, status, pincode, locality, area, closed_with_business_id, categories(name), profiles(full_name, phone))",
          )
          .eq("business_id", provider.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("jobs")
          .select(
            "id, title, status, pincode, locality, area, budget_min, budget_max, created_at, closed_with_business_id, categories(name), profiles(full_name, phone)",
          )
          .eq("closed_with_business_id", provider.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("live_sessions")
          .select("id, pincode, started_at, ends_at, is_active, is_deleted")
          .eq("business_id", provider.id)
          .order("started_at", { ascending: false })
          .limit(20),
      ]);
      if (cancelled) return;
      setInterests((interestsRes.data as unknown as InterestDetail[]) ?? []);
      setClosedJobs((dealsRes.data as unknown as JobDetail[]) ?? []);
      setLiveSessions((liveRes.data as LiveSession[]) ?? []);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [provider.id]);

  const bizId = provider.id;
  const waiting = interests.filter((i) => i.status === "waiting" && i.jobs?.status !== "closed");
  const won = interests.filter(
    (i) => i.jobs?.status === "closed" && i.jobs.closed_with_business_id === bizId,
  );
  const lost = interests.filter(
    (i) => i.jobs?.status === "closed" && i.jobs.closed_with_business_id !== bizId,
  );
  const shownInterests =
    interestTab === "waiting"
      ? waiting
      : interestTab === "won"
        ? won
        : interestTab === "lost"
          ? lost
          : interests;
  const liveNow = liveSessions.some((s) => s.is_active && !s.is_deleted);
  const owner = provider.profiles;

  return (
    <SlideOver
      title={provider.name}
      subtitle={
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={accountStatusBadge(provider.is_active, provider.is_deleted)}>
            {accountStatusLabel(provider.is_active, provider.is_deleted)}
          </Badge>
          {liveNow ? (
            <Badge className="bg-teal-soft text-teal">Live now</Badge>
          ) : (
            <Badge className="bg-surface text-ink-soft">Not live</Badge>
          )}
        </div>
      }
      onClose={onClose}
    >
      <div className="flex items-center gap-3 rounded-[16px] border border-line bg-surface/60 p-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-soft text-sm font-bold text-indigo">
          {initials(provider.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{owner?.full_name || "No owner name"}</p>
          <p className="truncate text-xs text-ink-soft">{owner?.email || "No email"}</p>
          <p className="text-xs text-ink-faint">{owner?.phone || "No phone"}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-bold text-ink-soft">Category</dt>
          <dd className="mt-0.5">{provider.categories?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Owner location</dt>
          <dd className="mt-0.5">{locationLabel(owner?.pincode ?? null, owner?.locality ?? null, owner?.area)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-bold text-ink-soft">Service areas</dt>
          <dd className="mt-0.5 text-ink-soft">{provider.coverage || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Listed</dt>
          <dd className="mt-0.5">{formatDateTime(provider.created_at)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-ink-soft">Live working</dt>
          <dd className="mt-0.5">{liveNow ? "Yes" : "No"}</dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Interests", loading ? "—" : interests.length],
          ["Waiting", loading ? "—" : waiting.length],
          ["Closed jobs", loading ? "—" : closedJobs.length],
          ["Live now", loading ? "—" : liveNow ? "Yes" : "No"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[14px] border border-line bg-white px-3 py-2.5 text-center">
            <p className="font-display text-lg font-extrabold">{value}</p>
            <p className="text-[11px] font-semibold text-ink-soft">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          <SkeletonLine width="7rem" className="h-4" />
          <Skeleton className="h-24 w-full rounded-[16px]" />
          <Skeleton className="h-24 w-full rounded-[16px]" />
        </div>
      ) : (
        <>
          <section className="mt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">Interested</h3>
              <div className="flex rounded-full bg-surface p-0.5">
                {(
                  [
                    ["all", `All (${interests.length})`],
                    ["waiting", `Waiting (${waiting.length})`],
                    ["won", `Won (${won.length})`],
                    ["lost", `Lost (${lost.length})`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      interestTab === id ? "bg-white text-ink shadow-card" : "text-ink-soft"
                    }`}
                    onClick={() => setInterestTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {shownInterests.length === 0 ? (
              <p className="py-3 text-sm text-ink-faint">No interests in this view.</p>
            ) : (
              <ul className="divide-y divide-line rounded-[16px] border border-line">
                {shownInterests.map((row) => (
                  <li key={row.id} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{row.jobs?.title ?? "Job"}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {row.jobs?.profiles?.full_name || "Customer"} · {row.jobs?.categories?.name ?? "—"}
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

          <section className="mt-5">
            <h3 className="mb-2 text-sm font-bold">Closed jobs ({closedJobs.length})</h3>
            <JobList jobs={closedJobs} empty="No jobs were closed with this provider." />
          </section>

          <section className="mt-5 pb-4">
            <h3 className="mb-2 text-sm font-bold">Live sessions</h3>
            {liveSessions.length === 0 ? (
              <p className="py-3 text-sm text-ink-faint">This provider has not gone live yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-[16px] border border-line">
                {liveSessions.map((session) => {
                  const active = session.is_active && !session.is_deleted;
                  return (
                    <li key={session.id} className="flex items-start justify-between gap-3 px-3 py-3">
                      <div>
                        <p className="font-semibold">{active ? "Live now" : "Ended"}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">Pincode {session.pincode}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {formatDateTime(session.started_at)} → {formatDateTime(session.ends_at)}
                        </p>
                      </div>
                      <Badge className={active ? "bg-teal-soft text-teal" : "bg-surface text-ink-soft"}>
                        {active ? "Live" : "Ended"}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </SlideOver>
  );
}
