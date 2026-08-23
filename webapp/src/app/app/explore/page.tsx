"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MapPinned } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import {
  categoryDisplayName,
  fetchCategoryTree,
  flattenCategories,
  type Category,
  type CategoryTreeGroup,
} from "@/lib/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ProvidersMapModal, type MapProvider } from "@/components/ProvidersMapModal";
import { useToast } from "@/components/Toast";
import { ExplorePageSkeleton, SkeletonProviderRow } from "@/components/ui/Skeleton";
import { displayPhone } from "@/lib/auth/phone";

type OwnerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  pincode: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

type Biz = {
  id: string;
  name: string;
  rating: number;
  owner_id: string;
  providerName: string | null;
  phone: string | null;
  categories: { id: string; name: string; slug: string; emoji: string | null } | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

function ExploreInner() {
  const params = useSearchParams();
  const initialSlug = params.get("category") ?? "";
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [categorySlug, setCategorySlug] = useState(initialSlug);
  const [tree, setTree] = useState<CategoryTreeGroup[]>([]);
  const [sort, setSort] = useState<"nearest" | "rated">("rated");
  const [items, setItems] = useState<Biz[]>([]);
  const [pincode, setPincode] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [profRes, groups] = await Promise.all([
          visible(supabase.from("profiles").select("pincode")).eq("id", user.id).single(),
          fetchCategoryTree(supabase),
        ]);
        setPincode(profRes.data?.pincode ?? null);
        setTree(groups);

        const allCats = flattenCategories(groups);
        const selected = allCats.find((c) => c.slug === categorySlug);

        let query = visible(
          supabase.from("businesses").select("id, name, rating, owner_id, categories(id, name, slug, emoji)"),
        );
        if (selected) query = query.eq("category_id", selected.id);
        const { data: all } = await query.order("rating", { ascending: false }).limit(40);

        if (!all?.length) {
          setItems([]);
          return;
        }

        const ownerIds = all.map((b: { owner_id: string }) => b.owner_id);
        const { data: profiles } = await visible(
          supabase.from("profiles").select("id, full_name, phone, pincode, address, lat, lng"),
        ).in("id", ownerIds);

        const byOwner = new Map<string, OwnerProfile>(
          ((profiles ?? []) as OwnerProfile[]).map((p) => [p.id, p]),
        );

        const withAddr = (
          all as Array<Omit<Biz, "address" | "lat" | "lng" | "phone" | "providerName">>
        ).map((b) => {
          const owner = byOwner.get(b.owner_id);
          return {
            ...b,
            providerName: owner?.full_name ?? null,
            phone: owner?.phone ?? null,
            address: owner?.address ?? null,
            lat: owner?.lat ?? null,
            lng: owner?.lng ?? null,
          } satisfies Biz;
        });

        const userPin = profRes.data?.pincode;
        if (!userPin) {
          setItems(withAddr);
          return;
        }

        const pinSet = new Set(
          [...byOwner.values()]
            .filter((p) => p.pincode === userPin)
            .map((p) => p.id),
        );
        const filtered = withAddr.filter((b) => pinSet.has(b.owner_id));
        setItems(filtered.length ? filtered : withAddr);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [categorySlug]);

  const chips: Category[] = flattenCategories(tree);

  const filtered = items.filter((b) => {
    if (!q.trim()) return true;
    const hay = `${b.name} ${categoryDisplayName(b.categories)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) =>
    sort === "rated" ? b.rating - a.rating : a.name.localeCompare(b.name),
  );

  const mapProviders: MapProvider[] = useMemo(
    () =>
      sorted.map((b) => ({
        id: b.id,
        name: b.name,
        providerName: b.providerName,
        rating: b.rating,
        phone: b.phone,
        address: b.address,
        lat: b.lat,
        lng: b.lng,
        categories: b.categories,
      })),
    [sorted],
  );

  if (loading && !tree.length) return <ExplorePageSkeleton />;

  return (
    <div className="page-pad">
      <header className="mb-6">
        <p className="eyebrow">Discover</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">Explore providers</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft sm:text-base">
          Browse trusted local businesses near {pincode ?? "your area"}.
        </p>
      </header>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2.5 rounded-[16px] border-[1.5px] border-line bg-white px-4 py-3 shadow-card">
          <span className="text-ink-faint">⌕</span>
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Search providers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(
            [
              ["rated", "Top rated"],
              ["nearest", "A–Z"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={`rounded-[14px] border px-4 py-3 text-sm font-bold ${
                sort === id
                  ? "border-blue-deep bg-blue-deep text-white"
                  : "border-line bg-white text-ink-soft"
              }`}
              onClick={() => setSort(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        <button
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${
            !categorySlug
              ? "border-blue-deep bg-blue-deep text-white"
              : "border-line bg-white text-ink-soft"
          }`}
          onClick={() => setCategorySlug("")}
        >
          All
        </button>
        {chips.map((c) => (
          <button
            key={c.id}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${
              categorySlug === c.slug
                ? "border-blue-deep bg-blue-deep text-white"
                : "border-line bg-white text-ink-soft"
            }`}
            onClick={() => setCategorySlug(c.slug)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProviderRow key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((b) => {
              const category = categoryDisplayName(b.categories);
              return (
                <div
                  key={b.id}
                  className="flex items-start gap-3 rounded-[18px] border border-line bg-white p-4 shadow-card"
                >
                  <CategoryIcon
                    value={b.categories?.emoji}
                    alt={b.categories?.name ?? b.name}
                    fallback="📍"
                    size="avatar"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{b.name}</p>
                    {category ? (
                      <span className="mt-1.5 inline-block rounded-full bg-blue-soft px-2.5 py-1 text-[10px] font-bold text-blue-deep">
                        {category}
                      </span>
                    ) : null}
                    <p className="mt-1.5 text-[12px] font-semibold text-ink">
                      {b.providerName?.trim() || "Provider"}
                    </p>
                    {b.phone ? (
                      <a
                        href={`tel:${b.phone.replace(/\D/g, "")}`}
                        className="mt-0.5 block font-mono text-[11.5px] font-bold text-blue-deep"
                      >
                        {displayPhone(b.phone)}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-ink-faint">No contact shared</p>
                    )}
                    <p className="mt-1 text-xs text-ink-soft">{b.rating.toFixed(1)} ★</p>
                    {b.address ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-faint">{b.address}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-bold text-blue-deep"
                    onClick={() => {
                      if (b.phone) {
                        window.location.href = `tel:${b.phone.replace(/\D/g, "")}`;
                        return;
                      }
                      showToast(`No contact for ${b.name}`);
                    }}
                  >
                    Call
                  </button>
                </div>
              );
            })}
          </div>

          {!sorted.length ? (
            <p className="py-10 text-center text-sm text-ink-soft">No providers found.</p>
          ) : null}
        </>
      )}

      <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-[24px] bg-indigo-soft p-5 sm:flex-row sm:items-center">
        <h3 className="font-display text-base font-bold text-indigo sm:text-lg">
          Not seeing the right fit?
        </h3>
        <Link
          href="/app/post-job"
          className="rounded-full bg-indigo px-5 py-2.5 text-sm font-bold text-white"
        >
          Post a Job
        </Link>
      </div>

      {/* Floating map button — sits above mobile bottom nav */}
      <button
        type="button"
        aria-label="Open providers map"
        onClick={() => setMapOpen(true)}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full grad-hero text-white shadow-pop transition hover:scale-105 active:scale-95 lg:bottom-8 lg:right-8"
      >
        <MapPinned size={22} strokeWidth={2.2} />
      </button>

      <ProvidersMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        providers={mapProviders}
      />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExplorePageSkeleton />}>
      <ExploreInner />
    </Suspense>
  );
}
