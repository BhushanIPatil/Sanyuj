"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { categoryDisplayName } from "@/lib/categories";
import {
  JOB_STATUSES,
  jobStatusBadgeClass,
  jobStatusLabel,
  type JobStatus,
} from "@/lib/jobs/status";
import { MyJobsPageSkeleton } from "@/components/ui/Skeleton";

type Job = {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  urgency: string;
  pincode: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  updated_at: string;
  categories: { id: string; name: string; slug: string } | null;
  interest_count?: number;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MyJobsPage() {
  const [tab, setTab] = useState<JobStatus>("open");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await visible(
          supabase.from("jobs").select(
            "id, title, description, status, urgency, pincode, budget_min, budget_max, created_at, updated_at, categories(id, name, slug)",
          ),
        )
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false });

        const list = (data as unknown as Job[]) ?? [];
        const withCounts = await Promise.all(
          list.map(async (j) => {
            const { count } = await visible(
              supabase.from("job_interests").select("*", { count: "exact", head: true }),
            )
              .eq("job_id", j.id)
              .neq("status", "withdrawn");
            return { ...j, interest_count: count ?? 0 };
          }),
        );
        setJobs(withCounts);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const counts = Object.fromEntries(
    JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s).length]),
  ) as Record<JobStatus, number>;
  const shown = jobs.filter((j) => j.status === tab);

  if (loading) return <MyJobsPageSkeleton />;

  return (
    <div className="page-pad">
      <header>
        <p className="eyebrow">Requests you&apos;ve posted</p>
        <h1 className="mt-1 font-display text-[19px] font-bold">My Jobs</h1>
      </header>

      <div className="mt-4 flex rounded-full bg-surface p-1">
        {JOB_STATUSES.map((status) => (
          <button
            key={status}
            className={`flex-1 rounded-full px-1 py-2.5 text-[11px] font-bold ${
              tab === status ? "bg-white text-ink shadow-card" : "text-ink-soft"
            }`}
            onClick={() => setTab(status)}
          >
            {jobStatusLabel(status)} ({counts[status]})
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((j) => {
          const category = categoryDisplayName(j.categories);
          return (
            <Link
              key={j.id}
              href={`/app/my-jobs/${j.id}`}
              className="flex flex-col rounded-[18px] border border-line bg-white p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                {category ? (
                  <span className="rounded-full bg-blue-soft px-2.5 py-1 text-[10px] font-bold text-blue-deep">
                    {category}
                  </span>
                ) : (
                  <span />
                )}
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${jobStatusBadgeClass(j.status)}`}
                >
                  {jobStatusLabel(j.status)}
                </span>
              </div>

              <p className="mt-2 text-sm font-bold leading-snug line-clamp-2">{j.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{j.description}</p>

              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-soft">
                <span>
                  📍 <b className="font-mono text-ink">{j.pincode}</b>
                </span>
                <span className="capitalize">{j.urgency.replace("_", " ")}</span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="rounded-[12px] bg-blue-soft px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-blue-deep">
                    Created
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-snug text-blue-deep">
                    {formatDateTime(j.created_at)}
                  </p>
                </div>
                {j.status === "closed" ? (
                  <div className="rounded-[12px] bg-green-soft px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-green-deep">
                      Closed
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold leading-snug text-green-deep">
                      {formatDateTime(j.updated_at)}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-[12px] bg-surface px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-ink-faint">
                      Interested
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold leading-snug text-ink">
                      {j.interest_count ?? 0} providers
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-dashed border-line pt-3 mt-3">
                <span className="font-mono text-[13.5px] font-bold">
                  {j.budget_min != null
                    ? `₹${j.budget_min}${j.budget_max ? ` – ${j.budget_max}` : ""}`
                    : "—"}
                </span>
                <span className="rounded-full bg-blue-soft px-2.5 py-1 text-[11px] font-bold text-blue-deep">
                  {j.status === "open" ? `${j.interest_count} interested →` : "View →"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {!shown.length ? (
        <div className="mt-4 rounded-[18px] border border-dashed border-line bg-surface p-6 text-center">
          <p className="text-sm text-ink-soft">No {jobStatusLabel(tab).toLowerCase()} jobs yet.</p>
          <Link href="/app/post-job" className="mt-3 inline-block text-sm font-bold text-blue-deep">
            Post a Job
          </Link>
        </div>
      ) : null}
    </div>
  );
}
