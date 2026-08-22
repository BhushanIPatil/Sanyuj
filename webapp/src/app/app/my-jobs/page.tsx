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

type Job = {
  id: string;
  title: string;
  status: JobStatus;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  categories: { id: string; name: string; slug: string } | null;
  interest_count?: number;
};

export default function MyJobsPage() {
  const [tab, setTab] = useState<JobStatus>("open");
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await visible(
        supabase.from("jobs").select(
          "id, title, status, budget_min, budget_max, created_at, categories(id, name, slug)",
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
    };
    void load();
  }, []);

  const counts = Object.fromEntries(
    JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s).length]),
  ) as Record<JobStatus, number>;
  const shown = jobs.filter((j) => j.status === tab);

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

      <div className="mt-4 space-y-3">
        {shown.map((j) => (
          <Link
            key={j.id}
            href={`/app/my-jobs/${j.id}`}
            className="block rounded-[18px] border border-line bg-white p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="max-w-[220px] text-sm font-bold leading-snug">{j.title}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${jobStatusBadgeClass(j.status)}`}
              >
                {jobStatusLabel(j.status)}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              {categoryDisplayName(j.categories)} · {new Date(j.created_at).toLocaleDateString()}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-line pt-3">
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
        ))}
        {!shown.length ? (
          <div className="rounded-[18px] border border-dashed border-line bg-surface p-6 text-center">
            <p className="text-sm text-ink-soft">No {jobStatusLabel(tab).toLowerCase()} jobs yet.</p>
            <Link href="/app/post-job" className="mt-3 inline-block text-sm font-bold text-blue-deep">
              Post a Job
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
