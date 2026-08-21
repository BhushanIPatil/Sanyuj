"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { categoryDisplayName } from "@/lib/categories";
import { useToast } from "@/components/Toast";

type CatRef = { id: string; name: string; slug: string } | null;

type Interest = {
  id: string;
  offered_amount: number | null;
  status: string;
  businesses: {
    id: string;
    name: string;
    rating: number;
    categories: CatRef;
  } | null;
};

type Job = {
  id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  budget_min: number | null;
  budget_max: number | null;
  pincode: string;
  categories: CatRef;
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);

  async function load() {
    const supabase = createClient();
    const { data: j } = await supabase
      .from("jobs")
      .select(
        "id, title, description, status, urgency, budget_min, budget_max, pincode, categories(id, name, slug)",
      )
      .eq("id", id)
      .single();
    setJob(j as unknown as Job | null);
    const { data: ints } = await supabase
      .from("job_interests")
      .select("id, offered_amount, status, businesses(id, name, rating, categories(id, name, slug))")
      .eq("job_id", id)
      .neq("status", "withdrawn");
    setInterests((ints as unknown as Interest[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function closeJob() {
    const supabase = createClient();
    await supabase.from("jobs").update({ status: "closed" }).eq("id", id);
    showToast("Job closed — thanks for using Sanyuj");
    router.push("/app/my-jobs");
  }

  if (!job) return <div className="p-8 text-ink-soft">Loading…</div>;

  return (
    <div className="page-pad">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/app/my-jobs"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <p className="eyebrow">Job · {job.status}</p>
          <h1 className="font-display text-[17px] font-bold">{job.title.slice(0, 40)}</h1>
        </div>
      </header>

      <div className="rounded-[26px] border border-line bg-white p-4.5 shadow-card">
        <p className="eyebrow">
          {categoryDisplayName(job.categories)} · {job.pincode}
        </p>
        <h2 className="mt-1.5 font-display text-[16.5px] font-bold leading-snug">{job.title}</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{job.description}</p>
        <div className="mt-3.5 flex gap-2.5">
          {[
            [
              job.budget_min != null
                ? `₹${job.budget_min}${job.budget_max ? `-${job.budget_max}` : ""}`
                : "—",
              "Budget",
            ],
            [job.urgency.replace("_", " "), "Timeline"],
            [String(interests.length), "Interested"],
          ].map(([v, l]) => (
            <div key={l} className="flex-1 rounded-[12px] bg-surface p-2.5 text-center">
              <div className="font-mono text-[13.5px] font-bold capitalize">{v}</div>
              <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-ink-soft">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="font-display text-base font-bold">Interested providers</h2>
        <div className="mt-3 space-y-3">
          {interests.map((i) => {
            const b = i.businesses;
            if (!b) return null;
            return (
              <div
                key={i.id}
                className="relative flex items-center gap-3 rounded-[18px] border border-line bg-white p-3.5 shadow-card"
              >
                <span className="absolute -top-2 right-3 rounded-full bg-ink px-2 py-1 font-mono text-[9px] font-bold text-white">
                  NEAR YOU
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-blue-soft font-display font-bold text-blue-deep">
                  {b.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{b.name}</p>
                  <p className="text-[11.5px] text-ink-soft">
                    {i.offered_amount != null ? (
                      <>
                        Offered <b className="text-ink">₹{i.offered_amount}</b> ·{" "}
                      </>
                    ) : null}
                    {b.rating.toFixed(1)} ★
                  </p>
                </div>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-[13px] grad-hero text-white"
                  onClick={() => showToast(`Calling ${b.name}…`)}
                >
                  ☎
                </button>
              </div>
            );
          })}
          {!interests.length ? (
            <p className="text-sm text-ink-soft">No interest yet — providers nearby will see your post.</p>
          ) : null}
        </div>
      </div>

      {job.status === "open" ? (
        <button
          className="mt-5 block w-full rounded-[18px] border-[1.5px] border-rose bg-white py-3.5 font-display text-sm font-bold text-rose"
          onClick={() => void closeJob()}
        >
          Close this job — I found someone
        </button>
      ) : null}
    </div>
  );
}
