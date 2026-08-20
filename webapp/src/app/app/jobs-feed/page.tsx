"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { categoryLabel } from "@/lib/auth/phone";
import { useToast } from "@/components/Toast";

type Job = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number | null;
  budget_max: number | null;
  pincode: string;
  created_at: string;
};

type Business = {
  id: string;
  name: string;
  category: string;
  rating: number;
  response_rate: number;
};

export default function JobsFeedPage() {
  const { showToast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [isLive, setIsLive] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [pincode, setPincode] = useState("");
  const [landmarkId, setLandmarkId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "today">("all");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("pincode, landmark_id")
        .eq("id", user.id)
        .single();
      setPincode(prof?.pincode ?? "");
      setLandmarkId(prof?.landmark_id ?? null);

      const { data: biz } = await supabase
        .from("businesses")
        .select("id, name, category, rating, response_rate")
        .eq("owner_id", user.id)
        .maybeSingle();
      setBusiness(biz);

      if (!biz) return;

      const { data: live } = await supabase
        .from("live_sessions")
        .select("id")
        .eq("business_id", biz.id)
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString())
        .maybeSingle();
      if (live) {
        setIsLive(true);
        setLiveId(live.id);
      }

      let q = supabase
        .from("jobs")
        .select("id, title, description, category, budget_min, budget_max, pincode, created_at")
        .eq("status", "open")
        .eq("category", biz.category)
        .order("created_at", { ascending: false })
        .limit(30);
      if (prof?.pincode) q = q.eq("pincode", prof.pincode);
      const { data: jobRows } = await q;
      setJobs(jobRows ?? []);

      const { data: ints } = await supabase
        .from("job_interests")
        .select("job_id")
        .eq("business_id", biz.id)
        .neq("status", "withdrawn");
      setInterestedIds(new Set((ints ?? []).map((i) => i.job_id)));
    };
    void load();
  }, []);

  async function toggleLive() {
    if (!business || !pincode) {
      showToast("Create a business profile first");
      return;
    }
    const supabase = createClient();
    if (isLive && liveId) {
      await supabase.from("live_sessions").update({ is_active: false }).eq("id", liveId);
      setIsLive(false);
      setLiveId(null);
      showToast("Live status turned off");
      return;
    }
    const ends = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("live_sessions")
      .insert({
        business_id: business.id,
        pincode,
        landmark_id: landmarkId,
        ends_at: ends,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) {
      showToast(error.message);
      return;
    }
    setIsLive(true);
    setLiveId(data.id);
    showToast("You are live — nearby customers can see & call you");
  }

  async function toggleInterest(jobId: string) {
    if (!business) return;
    const supabase = createClient();
    if (interestedIds.has(jobId)) {
      await supabase
        .from("job_interests")
        .update({ status: "withdrawn" })
        .eq("job_id", jobId)
        .eq("business_id", business.id);
      const next = new Set(interestedIds);
      next.delete(jobId);
      setInterestedIds(next);
      showToast("Interest withdrawn");
      return;
    }
    const { error } = await supabase.from("job_interests").upsert(
      { job_id: jobId, business_id: business.id, status: "waiting" },
      { onConflict: "job_id,business_id" },
    );
    if (error) {
      showToast(error.message);
      return;
    }
    setInterestedIds(new Set(interestedIds).add(jobId));
    showToast("Interest sent to customer");
  }

  if (!business) {
    return (
      <div className="px-5 pt-8 text-center">
        <h1 className="font-display text-xl font-bold">Job Feed</h1>
        <p className="mt-2 text-sm text-ink-soft">
          List your business to see open requests in your category and pincode.
        </p>
        <Link href="/app/business/setup" className="btn-primary mt-6 inline-block w-auto px-8">
          List your business
        </Link>
      </div>
    );
  }

  const shown = jobs.filter((j) => {
    if (filter !== "today") return true;
    const d = new Date(j.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div>
      <header className="flex items-center gap-3 px-5 pb-2 pt-5">
        <Link
          href="/app/profile"
          className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-line bg-white shadow-card"
        >
          ←
        </Link>
        <div>
          <p className="eyebrow">Business · {business.name}</p>
          <h1 className="font-display text-lg font-bold">Job Feed</h1>
        </div>
      </header>

      <div className="relative mx-5 overflow-hidden rounded-[26px] grad-hero p-5 text-white shadow-pop">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">
              Your response rate
            </p>
            <h2 className="mt-1.5 max-w-[200px] font-display text-[17px] font-bold leading-snug">
              You respond faster than {business.response_rate}% of nearby {categoryLabel(business.category).toLowerCase()}s
            </h2>
          </div>
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-[7px] border-white/30">
            <span className="font-mono text-base font-bold">{business.response_rate}%</span>
            <span className="text-[8px] uppercase opacity-85">Response</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void toggleLive()}
        className={`mx-5 mt-3.5 w-[calc(100%-2.5rem)] rounded-[26px] border-[1.5px] p-4 text-left transition ${
          isLive
            ? "border-green-deep bg-green-soft shadow-card"
            : "border-dashed border-line bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`relative flex h-10 w-10 items-center justify-center rounded-[14px] ${
              isLive ? "bg-green-deep text-white" : "bg-green-soft text-green-deep"
            }`}
          >
            📍
            {isLive ? (
              <span className="absolute inset-[-5px] animate-pulse-ring rounded-[17px] border-2 border-green-deep" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[13.5px] font-bold">
              {isLive ? (
                <>
                  <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-green-deep">
                    <span className="absolute inset-[-4px] animate-pulse-ring rounded-full border border-green-deep" />
                  </span>
                  You&apos;re LIVE now
                </>
              ) : (
                "Working in this area today?"
              )}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-ink-soft">
              {isLive
                ? `Visible to customers near ${pincode} · Auto-off in 2h`
                : "Tap to let nearby customers know you're here — they can call you directly."}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3.5 py-2 text-[11.5px] font-bold ${
              isLive
                ? "border-[1.5px] border-rose bg-white text-rose"
                : "grad-hero text-white"
            }`}
          >
            {isLive ? "Stop" : "Go Live"}
          </span>
        </div>
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2.5 px-5">
        {[
          [String(shown.length), "Open nearby"],
          [String(interestedIds.size), "Interested"],
          [`${business.rating.toFixed(1)}★`, "Your Rating"],
        ].map(([v, l]) => (
          <div
            key={l}
            className="rounded-[18px] border border-line bg-white px-2 py-3 text-center shadow-card"
          >
            <div className="font-mono text-[15px] font-bold">{v}</div>
            <div className="mt-1 text-[10px] font-semibold text-ink-soft">{l}</div>
          </div>
        ))}
      </div>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5">
        {(
          [
            ["all", "All nearby"],
            ["today", "Today only"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
              filter === id
                ? "border-blue-deep bg-blue-deep text-white"
                : "border-line bg-surface text-ink-soft"
            }`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between px-5">
        <h2 className="font-display text-base font-bold">Open requests</h2>
        <span className="text-xs font-bold text-blue-deep">{shown.length} posts</span>
      </div>

      <div className="mt-3 space-y-3 px-5 pb-4">
        {shown.map((j) => {
          const sent = interestedIds.has(j.id);
          return (
            <div key={j.id} className="relative rounded-[18px] border border-line bg-white p-4 shadow-card">
              <span className="absolute -top-2 right-3 rounded-full bg-ink px-2 py-1 font-mono text-[9px] font-bold text-white">
                {j.pincode}
              </span>
              <span className="mb-2 inline-block rounded-full bg-blue-soft px-2.5 py-1 text-[10px] font-bold text-blue-deep">
                {categoryLabel(j.category)}
              </span>
              <Link href={`/app/jobs-feed/${j.id}`} className="block text-sm font-bold leading-snug">
                {j.title}
              </Link>
              <p className="mt-1.5 line-clamp-2 text-xs text-ink-soft">{j.description}</p>
              <div className="mt-2.5 flex gap-3.5 text-[11px] text-ink-soft">
                <span>
                  🕐 <b className="font-mono text-ink">{new Date(j.created_at).toLocaleString()}</b>
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-line pt-3">
                <span className="font-mono text-[13.5px] font-bold">
                  {j.budget_min != null
                    ? `₹${j.budget_min}${j.budget_max ? ` – ${j.budget_max}` : ""}`
                    : "—"}
                </span>
                <button
                  type="button"
                  onClick={() => void toggleInterest(j.id)}
                  className={`rounded-full border-[1.5px] px-3.5 py-2 text-xs font-bold ${
                    sent
                      ? "border-green-deep bg-green-soft text-green-deep"
                      : "border-blue-deep bg-white text-blue-deep"
                  }`}
                >
                  {sent ? "Interest Sent" : "I'm Interested"}
                </button>
              </div>
            </div>
          );
        })}
        {!shown.length ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            No open jobs in your category nearby yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
