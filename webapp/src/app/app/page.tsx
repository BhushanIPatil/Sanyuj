"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import { useToast } from "@/components/Toast";
import {
  categoryDisplayName,
  fetchCategoryTree,
  flattenCategories,
  type Category,
} from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HomeAds } from "@/components/HomeAds";
import { HomePageSkeleton } from "@/components/ui/Skeleton";
import { displayPhone } from "@/lib/auth/phone";
import { loginUrl } from "@/lib/auth/guest";
import { Bell, RefreshCw } from "lucide-react";
import { jobStatusLabel } from "@/lib/jobs/status";
import { locationLabel } from "@/lib/geo/display";

type Profile = {
  full_name: string | null;
  pincode: string | null;
  locality: string | null;
  address: string | null;
};

type CatRef = { id: string; name: string; slug: string; emoji: string | null } | null;

type LiveRow = {
  id: string;
  started_at: string;
  businesses: {
    id: string;
    name: string;
    owner_id: string;
    categories: CatRef;
    ownerName: string | null;
    ownerPhone: string | null;
  } | null;
};

type NearbyBiz = {
  id: string;
  name: string;
  rating: number;
  categories: CatRef;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [closedRate, setClosedRate] = useState(0);
  const [refreshingLive, setRefreshingLive] = useState(false);
  const [stoppingLiveId, setStoppingLiveId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadLiveNearby(pincode?: string | null) {
    const supabase = createClient();
    let q = visible(
      supabase
        .from("live_sessions")
        .select("id, started_at, businesses(id, name, owner_id, categories(id, name, slug, emoji))"),
    )
      .gt("ends_at", new Date().toISOString())
      .order("started_at", { ascending: false })
      .limit(10);
    if (pincode) q = q.eq("pincode", pincode);

    const { data: liveRows } = await q;

    const raw = (liveRows as unknown as LiveRow[]) ?? [];
    const ownerIds = [
      ...new Set(raw.map((r) => r.businesses?.owner_id).filter((oid): oid is string => !!oid)),
    ];

    const ownerById = new Map<string, { full_name: string | null; phone: string | null }>();
    if (ownerIds.length) {
      const { data: owners } = await visible(
        supabase.from("profiles").select("id, full_name, phone"),
      ).in("id", ownerIds);
      for (const o of owners ?? []) {
        ownerById.set(o.id, { full_name: o.full_name, phone: o.phone });
      }
    }

    setLive(
      raw.map((row) => {
        if (!row.businesses) return row;
        const owner = ownerById.get(row.businesses.owner_id);
        return {
          ...row,
          businesses: {
            ...row.businesses,
            ownerName: owner?.full_name ?? null,
            ownerPhone: owner?.phone ?? null,
          },
        };
      }),
    );
  }

  async function refreshLive() {
    if (refreshingLive) return;
    setRefreshingLive(true);
    const started = Date.now();
    try {
      await loadLiveNearby(profile?.pincode);
    } catch {
      showToast("Could not refresh live providers");
    } finally {
      const elapsed = Date.now() - started;
      const minSpinMs = 600;
      if (elapsed < minSpinMs) {
        await new Promise((r) => setTimeout(r, minSpinMs - elapsed));
      }
      setRefreshingLive(false);
    }
  }

  async function stopOwnLive(liveSessionId: string) {
    if (stoppingLiveId) return;
    setStoppingLiveId(liveSessionId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("live_sessions").delete().eq("id", liveSessionId);
      if (error) throw error;
      showToast("Live status turned off");
      if (profile?.pincode) {
        await loadLiveNearby(profile.pincode);
      } else {
        setLive((prev) => prev.filter((r) => r.id !== liveSessionId));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not stop live");
    } finally {
      setStoppingLiveId(null);
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserId(user?.id ?? null);

        let prof: Profile | null = null;
        if (user) {
          const { data } = await visible(
            supabase.from("profiles").select("full_name, pincode, locality, address"),
          )
            .eq("id", user.id)
            .single();
          prof = data;
          setProfile(prof);

          const { data: biz } = await visible(supabase.from("businesses").select("id"))
            .eq("owner_id", user.id)
            .maybeSingle();
          setHasBusiness(!!biz);
        }

        try {
          const tree = await fetchCategoryTree(supabase);
          setCategories(flattenCategories(tree));
        } catch {
          setCategories([]);
        }

        await loadLiveNearby(prof?.pincode);

        const { data: allBiz } = await visible(
          supabase.from("businesses").select("id, name, rating, owner_id, categories(id, name, slug, emoji)"),
        ).limit(40);
        if (allBiz?.length) {
          const { data: owners } = await visible(supabase.from("profiles").select("id, pincode")).in(
            "id",
            allBiz.map((b: { owner_id: string }) => b.owner_id),
          );
          const pin = prof?.pincode;
          const pinOwners = new Set(
            (owners ?? [])
              .filter((o: { id: string; pincode: string | null }) => !pin || o.pincode === pin)
              .map((o: { id: string }) => o.id),
          );
          const near = pin
            ? allBiz.filter((b: { owner_id: string }) => pinOwners.has(b.owner_id)).slice(0, 6)
            : allBiz.slice(0, 6);
          setNearby(((near.length ? near : allBiz.slice(0, 6)) as unknown as NearbyBiz[]) ?? []);
        }

        if (user) {
          const { data: jobs } = await visible(
            supabase.from("jobs").select("id, title, status, budget_min, budget_max, created_at"),
          )
            .eq("customer_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5);
          setRecent((jobs as JobRow[] | null) ?? []);

          const all = (jobs as JobRow[] | null) ?? [];
          const closed = all.filter((j) => j.status === "closed").length;
          setClosedRate(all.length ? Math.round((closed / all.length) * 100) : 0);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const isGuest = !userId;
  const firstName = isGuest ? "there" : (profile?.full_name?.split(" ")[0] ?? "there");
  const displayAddress = isGuest
    ? "Browsing as guest"
    : locationLabel({
        locality: profile?.locality,
        pincode: profile?.pincode,
        address: profile?.address,
      });

  if (loading) return <HomePageSkeleton />;

  return (
    <div className="page-pad">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-indigo-soft font-display text-sm font-extrabold text-indigo">
            {initials(profile?.full_name ?? null)}
          </div>
          <div>
            <p className="font-display text-lg font-bold sm:text-xl">Hi, {firstName}</p>
            <p className="line-clamp-2 max-w-[14rem] text-sm leading-snug text-ink-soft sm:max-w-xs">
              {displayAddress ?? "Set your location"}
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

      <HomeAds />

      <div className="mt-8 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="relative inline-block h-2 w-2 rounded-full bg-green-deep">
              <span className="absolute inset-[-4px] animate-pulse-ring rounded-full border border-green-deep" />
            </span>
            Working near you now
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Providers who checked in as currently working — call them directly.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-green-deep">
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-green-deep">
              <span className="absolute inset-[-3px] animate-pulse-ring rounded-full border border-green-deep" />
            </span>
            {live.length} live
          </span>
          <button
            type="button"
            aria-label="Refresh live providers"
            disabled={refreshingLive}
            onClick={() => void refreshLive()}
            className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-line bg-white text-green-deep shadow-card transition hover:border-green-deep disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshingLive ? "animate-refresh-spin" : undefined}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {live.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-line bg-surface p-5 text-center text-sm text-ink-soft sm:col-span-2 lg:col-span-3 xl:col-span-4">
            No one is live nearby right now. Post a job or check Explore.
          </div>
        ) : (
          live.map((row) => {
            const b = row.businesses;
            if (!b) return null;
            const category = categoryDisplayName(b.categories);
            const isOwn = !!userId && b.owner_id === userId;
            return (
              <div
                key={row.id}
                className={`relative rounded-[18px] border bg-white p-4 shadow-card ${
                  isOwn ? "border-green-deep/40" : "border-line"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <span className="absolute inset-[-4px] animate-pulse-ring rounded-[18px] border-2 border-green-deep" />
                    <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[15px] bg-blue-soft font-display text-sm font-bold text-blue-deep">
                      {initials(b.name)}
                    </div>
                    <span className="absolute -bottom-1.5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-green-deep px-1.5 py-0.5 text-[8px] font-extrabold text-white">
                      LIVE
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug">{b.name}</p>
                    {category ? (
                      <span className="mt-1.5 inline-block rounded-full bg-blue-soft px-2.5 py-1 text-[10px] font-bold text-blue-deep">
                        {category}
                      </span>
                    ) : null}
                    {isOwn ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-green-deep">
                        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-green-deep">
                          <span className="absolute inset-[-3px] animate-pulse-ring rounded-full border border-green-deep" />
                        </span>
                        You are live
                      </p>
                    ) : (
                      <>
                        <p className="mt-1.5 text-[12px] font-semibold text-ink">
                          {b.ownerName?.trim() || "Provider"}
                        </p>
                        {b.ownerPhone ? (
                          <a
                            href={`tel:${b.ownerPhone.replace(/\D/g, "")}`}
                            className="mt-0.5 block font-mono text-[11.5px] font-bold text-blue-deep"
                          >
                            {displayPhone(b.ownerPhone)}
                          </a>
                        ) : (
                          <p className="mt-0.5 text-[11px] text-ink-faint">No contact shared</p>
                        )}
                      </>
                    )}
                    <p className="mt-1.5 text-[11px] font-bold text-green-deep">
                      Checked in {timeAgo(row.started_at)}
                    </p>
                  </div>
                  {isOwn ? (
                    <button
                      type="button"
                      disabled={stoppingLiveId === row.id}
                      onClick={() => void stopOwnLive(row.id)}
                      className="shrink-0 rounded-full border-[1.5px] border-rose bg-white px-3.5 py-2 text-[11.5px] font-bold text-rose disabled:opacity-60"
                    >
                      {stoppingLiveId === row.id ? "…" : "Stop"}
                    </button>
                  ) : b.ownerPhone ? (
                    <a
                      href={`tel:${b.ownerPhone.replace(/\D/g, "")}`}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] grad-hero text-white"
                      aria-label={`Call ${b.ownerName ?? b.name}`}
                    >
                      ☎
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-surface text-ink-faint"
                      onClick={() => showToast(`No contact for ${b.name}`)}
                    >
                      ☎
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link
        href="/app/explore"
        className="mt-6 flex items-center gap-2.5 rounded-[18px] border border-line bg-surface px-4 py-3.5 text-sm text-ink-faint transition hover:border-blue-deep hover:text-ink"
      >
        Search &quot;electrician&quot;, &quot;AC repair&quot;…
      </Link>

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold">Categories</h2>
        <Link href="/app/explore" className="text-sm font-bold text-blue-deep">
          See all
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/app/explore?category=${c.slug}`}
            className="flex flex-col items-center gap-2 rounded-[18px] border border-line bg-white px-3 py-4 shadow-card transition hover:border-blue-deep"
          >
            <CategoryIcon value={c.emoji} alt={c.name} />
            <span className="text-center text-sm font-bold leading-tight">{c.name}</span>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-[24px] bg-indigo-soft p-5 sm:flex-row sm:items-center">
        <h3 className="max-w-xl font-display text-base font-bold leading-snug text-indigo sm:text-lg">
          Can&apos;t find your exact need? Post it &amp; let providers come to you.
        </h3>
        <Link
          href={isGuest ? loginUrl("/app/post-job") : "/app/post-job"}
          className="shrink-0 rounded-full bg-indigo px-5 py-2.5 text-sm font-bold text-white"
        >
          {isGuest ? "Log in to post" : "Post a Job"}
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-lg font-bold">Nearby providers</h2>
          <div className="mt-4 space-y-3">
            {nearby.length === 0 ? (
              <p className="text-sm text-ink-soft">No listed businesses in your pincode yet.</p>
            ) : (
              nearby.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-4 shadow-card"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-teal-soft font-display font-bold text-teal">
                    {initials(b.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{b.name}</p>
                    <p className="text-xs text-ink-soft">
                      {categoryDisplayName(b.categories)} · {b.rating.toFixed(1)} ★
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
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Recent activity</h2>
          <div className="mt-4 space-y-2.5">
            {recent.length === 0 ? (
              isGuest ? (
                <p className="text-sm text-ink-soft">
                  Log in to post jobs and track them here.{" "}
                  <Link href={loginUrl("/app/post-job")} className="font-bold text-blue-deep">
                    Log in
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-ink-soft">Your posted jobs will show up here.</p>
              )
            ) : (
              recent.map((j) => (
                <Link
                  key={j.id}
                  href={`/app/my-jobs/${j.id}`}
                  className="flex items-center gap-3 rounded-[18px] border border-line bg-white p-4 shadow-card"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${
                      j.status === "closed" ? "bg-green-soft text-green-deep" : "bg-amber-soft text-amber"
                    }`}
                  >
                    {j.status === "closed" ? "✓" : "⏱"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{j.title}</p>
                    <p
                      className={`text-xs font-semibold ${
                        j.status === "closed" ? "text-green-deep" : "text-amber"
                      }`}
                    >
                      {jobStatusLabel(j.status)}
                    </p>
                  </div>
                  <div className="text-right font-mono text-sm font-bold">
                    {j.budget_min != null
                      ? `₹${j.budget_min}${j.budget_max ? `-${j.budget_max}` : ""}`
                      : "—"}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {isGuest || !hasBusiness ? (
          <Link
            href={isGuest ? loginUrl("/app/business/setup") : "/app/business/setup"}
            className="flex items-center gap-3.5 rounded-[24px] border border-green-deep/20 p-5"
            style={{ background: "linear-gradient(135deg,#E1F9EE 0%,#E6F2FE 100%)" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-white text-xl shadow-card">
              🏪
            </div>
            <div className="flex-1">
              <h3 className="font-display text-base font-bold">Have a business or offer a service?</h3>
              <p className="mt-1 text-sm leading-snug text-ink-soft">
                List it free on Sanyuj and start getting job requests nearby.
              </p>
            </div>
            <span className="text-lg font-bold text-green-deep">→</span>
          </Link>
        ) : (
          <div />
        )}

        <div className="relative overflow-hidden rounded-[24px] grad-hero p-5 text-white shadow-pop">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/75">Your jobs</p>
              <h2 className="mt-1.5 max-w-xs font-display text-lg font-bold leading-snug">
                {closedRate}% of your recent jobs are closed
              </h2>
              <Link
                href="/app/my-jobs"
                className="mt-3 inline-block rounded-full bg-white px-4 py-2.5 text-sm font-bold text-blue-deep"
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
    </div>
  );
}
