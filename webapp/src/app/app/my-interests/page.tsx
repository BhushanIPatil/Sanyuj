"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";

type Row = {
  id: string;
  status: string;
  offered_amount: number | null;
  created_at: string;
  jobs: { id: string; title: string; status: string } | null;
};

export default function MyInterestsPage() {
  const [tab, setTab] = useState<"waiting" | "selected" | "closed">("waiting");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
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
        supabase.from("job_interests").select("id, status, offered_amount, created_at, jobs(id, title, status)"),
      )
        .eq("business_id", biz.id)
        .neq("status", "withdrawn")
        .order("created_at", { ascending: false });
      setRows((data as unknown as Row[]) ?? []);
    };
    void load();
  }, []);

  const waiting = rows.filter((r) => r.status === "waiting");
  const selected = rows.filter((r) => r.status === "selected");
  const closed = rows.filter(
    (r) => r.status === "closed" || r.jobs?.status === "closed",
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
          <p className="eyebrow">Jobs you&apos;ve responded to</p>
          <h1 className="font-display text-lg font-bold">My Interests</h1>
        </div>
      </header>

      <div className="flex rounded-full bg-surface p-1">
        {(
          [
            ["waiting", `Waiting (${waiting.length})`],
            ["selected", `Selected (${selected.length})`],
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
        {shown.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3.5 shadow-card"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${
                r.status === "selected" || r.jobs?.status === "closed"
                  ? "bg-green-soft text-green-deep"
                  : "bg-amber-soft text-amber"
              }`}
            >
              {r.status === "waiting" ? "⏱" : "✓"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold">{r.jobs?.title ?? "Job"}</p>
              <p
                className={`text-[11.5px] font-semibold ${
                  r.status === "waiting" ? "text-amber" : "text-green-deep"
                }`}
              >
                {r.status === "waiting"
                  ? "Waiting for call"
                  : r.status === "selected"
                    ? "You got this job"
                    : "Closed"}
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
        ))}
        {!shown.length ? (
          <p className="py-8 text-center text-sm text-ink-soft">Nothing here yet.</p>
        ) : null}
      </div>
    </div>
  );
}
