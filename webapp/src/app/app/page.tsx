"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { CATEGORIES, categoryLabel } from "@/lib/auth/phone";
import { Bell } from "lucide-react";

type Profile = {
  full_name: string | null;
  pincode: string | null;
};

type LiveRow = {
  id: string;
  started_at: string;
  businesses: {
    id: string;
    name: string;
    category: string;
    owner_id: string;
  } | null;
};

type NearbyBiz = {
  id: string;
  name: string;
  category: string;
  rating: number;
};

type JobRow = {
  id: string;
  title: string;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
};

function initials(name: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HomePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [live, setLive] = useState<LiveRow[]>([]);
  const [nearby, setNearby] = useState<NearbyBiz[]>([]);
  const [recent, setRecent] = useState<JobRow[]>([]);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [closedRate, setClosedRate] = useState(0);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, pincode")
        .eq("id", user.id)
        .single();
      setProfile(prof);

      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      setHasBusiness(!!biz);

      if (prof?.pincode) {
        const { data: liveRows } = await supabase
          .from("live_sessions")
          .select("id, started_at, businesses(id, name, category, owner_id)")
          .eq("pincode", prof.pincode)
          .eq("is_active", true)
          .gt("ends_at", new Date().toISOString())
          .order("started_at", { ascending: false })
          .limit(10);
        setLive((liveRows as unknown as LiveRow[]) ?? []);

        const { data: allBiz } = await supabase
          .from("businesses")
          .select("id, name, category, rating, owner_id")
          .limit(40);
        if (allBiz?.length) {
          const { data: owners } = await supabase
            .from("profiles")
            .select("id, pincode")
            .in(
              "id",
              allBiz.map((b) => b.owner_id),
            );
          const pinOwners = new Set(
            (owners ?? []).filter((o) => o.pincode === prof.pincode).map((o) => o.id),
          );
          const near = allBiz.filter((b) => pinOwners.has(b.owner_id)).slice(0, 6);
          setNearby(near.length ? near : allBiz.slice(0, 6));
        }
      }

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, status, budget_min, budget_max, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecent(jobs ?? []);

      const all = jobs ?? [];
      const closed = all.filter((j) => j.status === "closed").length;
      setClosedRate(all.length ? Math.round((closed / all.length) * 100) : 0);
    };
    void load();
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div>
      <header className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-indigo-soft font-display text-sm font-extrabold text-indigo">
            {initials(profile?.full_name ?? null)}
          </div>
          <div>
            <p className="text-[15px] font-bold">Hi, {firstName}</p>
            <p className="text-[11.5px] text-ink-soft">
              {profile?.pincode ? `Pincode · ${profile.pincode}` : "Set your location"}
            </p>
          </div>
        </div>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-[14px] border border-line bg-white shadow-card"
          onClick={() => showToast("No new notifications")}
        >
          <Bell size={17} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose" />
        </button>
      </header>

      <div className="mt-4 overflow-hidden px-5">
        <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto">
          {[
            {
              title: "Need a plumber today?",
              body: "Post a job and nearby providers will respond.",
              cta: "Post a Job",
              href: "/app/post-job",
              bg: "linear-gradient(135deg,#2E86D6,#3B5BDB)",
            },
            {
              title: "List your business free",
              body: "Get job requests from customers near you.",
              cta: "Get started",
              href: "/app/business/setup",
              bg: "linear-gradient(135deg,#1FAE7A,#0EA5A5)",
            },
          ].map((ad) => (
            <div
              key={ad.title}
              className="relative min-h-[128px] w-[87%] flex-none snap-start overflow-hidden rounded-[26px] p-4 text-white shadow-card"
              style={{ background: ad.bg }}
            >
              <span className="float-right rounded-full bg-white/25 px-2 py-1 text-[8.5px] font-bold uppercase">
                Sanyuj
              </span>
              <h3 className="mt-6 max-w-[210px] font-display text-[15px] font-bold leading-snug">
                {ad.title}
              </h3>
              <p className="mt-1 max-w-[220px] text-[11px] text-white/90">{ad.body}</p>
              <Link
                href={ad.href}
                className="mt-3 inline-block rounded-full bg-white px-3.5 py-2 text-[11.5px] font-bold text-blue-deep"
              >
                {ad.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-baseline justify-between px-5">
        <h2 className="flex items-center gap-2 font-display text-base font-bold">
          <span className="relative inline-block h-2 w-2 rounded-full bg-green-deep">
            <span className="absolute inset-[-4px] animate-pulse-ring rounded-full border border-green-deep" />
          </span>
          Working near you now
        </h2>
        <span className="text-xs font-bold text-green-deep">{live.length} live</span>
      </div>
      <p className="mt-1 px-5 text-[11.5px] text-ink-soft">
        Providers who checked in as currently working — call them directly.
      </p>

      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
        {live.length === 0 ? (
          <div className="w-full rounded-[18px] border border-dashed border-line bg-surface p-4 text-center text-xs text-ink-soft">
            No one is live nearby right now. Post a job or check Explore.
          </div>
        ) : (
          live.map((row) => {
            const b = row.businesses;
            if (!b) return null;
            return (
              <div
                key={row.id}
                className="w-[138px] flex-none rounded-[18px] border border-line bg-white p-3.5 text-center shadow-card"
              >
                <div className="relative mx-auto h-14 w-14">
                  <span className="absolute inset-[-5px] animate-pulse-ring rounded-[20px] border-2 border-green-deep" />
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-[17px] bg-blue-soft font-display text-lg font-bold text-blue-deep">
                    {initials(b.name)}
                  </div>
                  <span className="absolute -bottom-1.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-green-deep px-1.5 py-0.5 text-[8px] font-extrabold text-white">
                    LIVE
                  </span>
                </div>
                <p className="mt-3 text-[12.5px] font-bold">{b.name.split(" ")[0]}</p>
                <p className="text-[10px] text-ink-soft">{categoryLabel(b.category)}</p>
                <p className="mt-1 text-[9px] font-bold text-green-deep">
                  Checked in {timeAgo(row.started_at)}
                </p>
                <button
                  className="btn-primary mt-2.5 !rounded-full !py-2 text-[10.5px]"
                  onClick={() => showToast(`Open dialer for ${b.name}`)}
                >
                  Call now
                </button>
              </div>
            );
          })
        )}
      </div>

      <Link
        href="/app/explore"
        className="mx-5 mt-4 flex items-center gap-2.5 rounded-[18px] border border-line bg-surface px-3.5 py-3.5 text-[13.5px] text-ink-faint"
      >
        Search &quot;electrician&quot;, &quot;AC repair&quot;…
      </Link>

      <div className="mt-5 flex items-baseline justify-between px-5">
        <h2 className="font-display text-base font-bold">Categories</h2>
        <Link href="/app/explore" className="text-xs font-bold text-blue-deep">
          See all
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5 px-5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/app/explore?category=${c.id}`}
            className="flex flex-col items-center gap-2 rounded-[18px] border border-line bg-white px-2 py-3.5 shadow-card"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-blue-soft text-lg">
              {c.emoji}
            </span>
            <span className="text-center text-[11.5px] font-bold leading-tight">{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="mx-5 mt-5 flex items-center justify-between gap-3 rounded-[26px] bg-indigo-soft p-4">
        <h3 className="max-w-[170px] font-display text-[14.5px] font-bold leading-snug text-indigo">
          Can&apos;t find your exact need? Post it &amp; let providers come to you.
        </h3>
        <Link
          href="/app/post-job"
          className="shrink-0 rounded-full bg-indigo px-3.5 py-2.5 text-xs font-bold text-white"
        >
          Post a Job
        </Link>
      </div>

      <div className="mt-5 px-5">
        <h2 className="font-display text-base font-bold">Nearby providers</h2>
        <div className="mt-3 space-y-3">
          {nearby.length === 0 ? (
            <p className="text-sm text-ink-soft">No listed businesses in your pincode yet.</p>
          ) : (
            nearby.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3.5 shadow-card"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-teal-soft font-display font-bold text-teal">
                  {initials(b.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{b.name}</p>
                  <p className="text-[11.5px] text-ink-soft">
                    {categoryLabel(b.category)} · {b.rating.toFixed(1)} ★
                  </p>
                </div>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-[13px] grad-hero text-white"
                  onClick={() => showToast(`Calling ${b.name}…`)}
                >
                  ☎
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 px-5">
        <h2 className="font-display text-base font-bold">Recent activity</h2>
        <div className="mt-3 space-y-2.5">
          {recent.length === 0 ? (
            <p className="text-sm text-ink-soft">Your posted jobs will show up here.</p>
          ) : (
            recent.map((j) => (
              <Link
                key={j.id}
                href={`/app/my-jobs/${j.id}`}
                className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-3.5 shadow-card"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${
                    j.status === "closed" ? "bg-green-soft text-green-deep" : "bg-amber-soft text-amber"
                  }`}
                >
                  {j.status === "closed" ? "✓" : "⏱"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold">{j.title}</p>
                  <p
                    className={`text-[11.5px] font-semibold ${
                      j.status === "closed" ? "text-green-deep" : "text-amber"
                    }`}
                  >
                    {j.status === "closed" ? "Closed" : "Open"}
                  </p>
                </div>
                <div className="text-right font-mono text-[13.5px] font-bold">
                  {j.budget_min != null
                    ? `₹${j.budget_min}${j.budget_max ? `-${j.budget_max}` : ""}`
                    : "—"}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {!hasBusiness ? (
        <Link
          href="/app/business/setup"
          className="mx-5 mt-5 flex items-center gap-3.5 rounded-[26px] border border-green-deep/20 p-4"
          style={{ background: "linear-gradient(135deg,#E1F9EE 0%,#E6F2FE 100%)" }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-white shadow-card text-lg">
            🏪
          </div>
          <div className="flex-1">
            <h3 className="font-display text-sm font-bold">Have a business or offer a service?</h3>
            <p className="mt-1 text-[11px] leading-snug text-ink-soft">
              List it free on Sanyuj and start getting job requests nearby.
            </p>
          </div>
          <span className="text-lg font-bold text-green-deep">→</span>
        </Link>
      ) : null}

      <div className="relative mx-5 mt-5 overflow-hidden rounded-[26px] grad-hero p-5 text-white shadow-pop">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">Your jobs</p>
            <h2 className="mt-1.5 max-w-[185px] font-display text-[17px] font-bold leading-snug">
              {closedRate}% of your recent jobs are closed
            </h2>
            <Link
              href="/app/my-jobs"
              className="mt-3 inline-block rounded-full bg-white px-4 py-2.5 text-[12.5px] font-bold text-blue-deep"
            >
              View My Jobs
            </Link>
          </div>
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-[7px] border-white/30">
            <span className="font-mono text-base font-bold">{closedRate}%</span>
            <span className="text-[8px] uppercase opacity-85">Closed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
