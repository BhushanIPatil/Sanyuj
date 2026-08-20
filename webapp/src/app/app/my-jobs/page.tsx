"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/auth/phone";

type Job = {
  id: string;
  title: string;
  category: string;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  interest_count?: number;
};

export default function MyJobsPage() {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("jobs")
        .select("id, title, category, status, budget_min, budget_max, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      const list = data ?? [];
      const withCounts = await Promise.all(
        list.map(async (j) => {
          const { count } = await supabase
            .from("job_interests")
            .select("*", { count: "exact", head: true })
            .eq("job_id", j.id)
            .neq("status", "withdrawn");
          return { ...j, interest_count: count ?? 0 };
        }),
      );
      setJobs(withCounts);
    };
    void load();
  }, []);

  const open = jobs.filter((j) => j.status === "open");
  const closed = jobs.filter((j) => j.status === "closed");
  const shown = tab === "open" ? open : closed;

  return (
    <div>
      <header className="px-5 pt-5">
        <p className="eyebrow">Requests you&apos;ve posted</p>
        <h1 className="mt-1 font-display text-[19px] font-bold">My Jobs</h1>
      </header>

      <div className="mx-5 mt-4 flex rounded-full bg-surface p-1">
        <button
          className={`flex-1 rounded-full py-2.5 text-xs font-bold ${
            tab === "open" ? "bg-white text-ink shadow-card" : "text-ink-soft"
          }`}
          onClick={() => setTab("open")}
        >
          Open ({open.length})
        </button>
        <button
          className={`flex-1 rounded-full py-2.5 text-xs font-bold ${
            tab === "closed" ? "bg-white text-ink shadow-card" : "text-ink-soft"
          }`}
          onClick={() => setTab("closed")}
        >
          Closed ({closed.length})
        </button>
      </div>

      <div className="mt-4 space-y-3 px-5">
        {shown.map((j) => (
          <Link
            key={j.id}
            href={`/app/my-jobs/${j.id}`}
            className="block rounded-[18px] border border-line bg-white p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="max-w-[220px] text-sm font-bold leading-snug">{j.title}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  j.status === "open"
                    ? "bg-green-soft text-green-deep"
                    : "bg-surface text-ink-soft"
                }`}
              >
                {j.status}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              {categoryLabel(j.category)} · {new Date(j.created_at).toLocaleDateString()}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-line pt-3">
              <span className="font-mono text-[13.5px] font-bold">
                {j.budget_min != null
                  ? `₹${j.budget_min}${j.budget_max ? ` – ${j.budget_max}` : ""}`
                  : "—"}
              </span>
              <span className="rounded-full bg-blue-soft px-2.5 py-1 text-[11px] font-bold text-blue-deep">
                {j.status === "closed" ? "Done ✓" : `${j.interest_count} interested →`}
              </span>
            </div>
          </Link>
        ))}
        {!shown.length ? (
          <div className="rounded-[18px] border border-dashed border-line bg-surface p-6 text-center">
            <p className="text-sm text-ink-soft">No {tab} jobs yet.</p>
            <Link href="/app/post-job" className="mt-3 inline-block text-sm font-bold text-blue-deep">
              Post a Job
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
