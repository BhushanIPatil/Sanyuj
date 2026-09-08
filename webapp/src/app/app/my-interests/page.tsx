"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { MyInterestsPageSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Inbox } from "lucide-react";

type Row = {
  id: string;
  status: string;
  business_id: string;
  offered_amount: number | null;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    status: string;
    closed_with_business_id: string | null;
  } | null;
};

export default function MyInterestsPage() {
  const [tab, setTab] = useState<"waiting" | "selected" | "closed">("waiting");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: biz } = await visible(supabase.from("businesses").select("id"))
          .eq("owner_id", user.id)
          .maybeSingle();
        if (!biz) return;
        const { data } = await visible(
          supabase
            .from("job_interests")
            .select(
              "id, status, business_id, offered_amount, created_at, jobs(id, title, status, closed_with_business_id)",
            ),
        )
          .eq("business_id", biz.id)
          .neq("status", "withdrawn")
          .order("created_at", { ascending: false });
        setRows((data as unknown as Row[]) ?? []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <MyInterestsPageSkeleton />;

  const waiting = rows.filter(
    (r) => r.status === "waiting" && r.jobs?.status !== "closed",
  );
  const selected = rows.filter(
    (r) =>
      r.jobs?.status === "closed" &&
      r.jobs.closed_with_business_id === r.business_id,
  );
  const closed = rows.filter(
    (r) =>
      r.jobs?.status === "closed" &&
      r.jobs.closed_with_business_id !== r.business_id,
  );
  const shown = tab === "waiting" ? waiting : tab === "selected" ? selected : closed;

  return (
    <div className="page-pad">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/app/profile"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <h1 className="font-display text-lg font-bold">My Interests</h1>
        </div>
      </header>

      <div className="flex rounded-full bg-surface p-1">
        {(
          [
            ["waiting", `Waiting (${waiting.length})`],
            ["selected", `Won (${selected.length})`],
            ["closed", `Closed (${closed.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={`flex-1 rounded-full py-2.5 text-[11px] font-bold ${
              tab === id ? "bg-white text-ink shadow-card" : "text-ink-soft"
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {shown.map((r) => {
          const won =
            r.jobs?.status === "closed" &&
            r.jobs.closed_with_business_id === r.business_id;
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3.5 shadow-card"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${
                  won ? "bg-green-soft text-green-deep" : "bg-amber-soft text-amber"
                }`}
              >
                {r.status === "waiting" && r.jobs?.status !== "closed" ? "⏱" : "✓"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold">{r.jobs?.title ?? "Job"}</p>
                <p
                  className={`text-[11.5px] font-semibold ${
                    won
                      ? "text-green-deep"
                      : r.jobs?.status === "closed"
                        ? "text-ink-soft"
                        : "text-amber"
                  }`}
                >
                  {won
                    ? "You got this job"
                    : r.jobs?.status === "closed"
                      ? "Closed with another provider"
                      : "Waiting for call"}
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono text-[13.5px] font-bold">
                  {r.offered_amount != null ? `₹${r.offered_amount}` : "—"}
                </div>
                <div className="text-[10.5px] text-ink-faint">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          );
        })}
        {!shown.length ? (
          <EmptyState
            icon={Inbox}
            title="Nothing here yet"
            message="When you respond to nearby jobs, your interests will show up here."
            actionLabel="Open Job Feed"
            actionHref="/app/jobs-feed"
          />
        ) : null}
      </div>
    </div>
  );
}
