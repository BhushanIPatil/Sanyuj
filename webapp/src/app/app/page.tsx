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
import { EmptyState } from "@/components/EmptyState";
import { HomePageSkeleton } from "@/components/ui/Skeleton";
import { displayPhone } from "@/lib/auth/phone";
import { loginUrl } from "@/lib/auth/guest";
import { Radio, RefreshCw, Store } from "lucide-react";
import { fetchCoveringBusinessIds } from "@/lib/geo/coverage";

type Profile = {
  full_name: string | null;
  pincode: string | null;
  locality: string | null;
  locality_id: string | null;
  area: string | null;
  area_id: string | null;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [hasBusiness, setHasBusiness] = useState(false);
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
            supabase.from("profiles").select("full_name, pincode, locality, locality_id, area, area_id, address"),
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

        const bizSelect = "id, name, rating, owner_id, categories(id, name, slug, emoji)";
        const pin = prof?.pincode;
        if (!pin) {
          const { data: allBiz } = await visible(supabase.from("businesses").select(bizSelect)).limit(6);
          setNearby((allBiz as unknown as NearbyBiz[]) ?? []);
        } else {
          const covering = await fetchCoveringBusinessIds(supabase, {
            pincode: pin,
            localityId: prof?.locality_id,
            areaId: prof?.area_id,
          });
          if (!covering.length) {
            setNearby([]);
          } else {
            const { data: nearbyBiz } = await visible(supabase.from("businesses").select(bizSelect))
              .in("id", covering)
              .order("rating", { ascending: false })
              .limit(6);
            setNearby((nearbyBiz as unknown as NearbyBiz[]) ?? []);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const isGuest = !userId;

  if (loading) return <HomePageSkeleton />;

  return (
    <div className="page-pad">
      <HomeAds pincode={profile?.pincode} localityId={profile?.locality_id} areaId={profile?.area_id} />

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
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <EmptyState
              icon={Radio}
              title="No one is live nearby"
              message="Providers who check in as working will appear here. Browse Explore to find nearby help."
              actionLabel="Explore providers"
              actionHref="/app/explore"
            />
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

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold">Categories</h2>
        <Link href="/app/explore" className="text-sm font-bold text-blue-deep">
          See all
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/app/explore?category=${c.slug}`}
            className="flex flex-col items-center gap-2 px-1 py-1 transition hover:opacity-80"
          >
            <CategoryIcon value={c.emoji} alt={c.name} />
            <span className="text-center text-[12px] font-bold leading-tight sm:text-sm">{c.name}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-bold">Nearby providers</h2>
        <div className="mt-4 space-y-3">
            {nearby.length === 0 ? (
              <EmptyState
                icon={Store}
                title="No providers nearby"
                message="No providers in this area yet. Try Explore, or list your business so neighbours can find you."
                actionLabel="Explore providers"
                actionHref="/app/explore"
              />
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
      </div>

      <div className="mt-8">
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
                List it free on Sanyuj and get found by neighbours nearby.
              </p>
            </div>
            <span className="text-lg font-bold text-green-deep">→</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
