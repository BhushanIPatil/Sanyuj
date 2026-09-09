"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { visible } from "@/lib/db/visible";
import {
  categoryDisplayName,
  fetchCategoryTree,
  type Category,
  type CategoryTreeGroup,
} from "@/lib/categories";
import { CategoryFilterRow } from "@/components/CategoryFilterRow";
import { useToast } from "@/components/Toast";
import { ExplorePageSkeleton, SkeletonProviderRow } from "@/components/ui/Skeleton";
import { displayPhone } from "@/lib/auth/phone";
import { fetchCoveringBusinessIds } from "@/lib/geo/coverage";
import { EmptyState } from "@/components/EmptyState";
import { Store } from "lucide-react";
import { BusinessAvatar } from "@/components/BusinessPhotoPicker";
import { ProviderDetailSheet, type ProviderDetail } from "@/components/ProviderDetailSheet";
import {
  ActiveFilterChips,
  FilterDrawer,
  FilterLayout,
  FilterPanel,
  FilterToolbar,
  ResultsCount,
  makeGeo,
  selectedValues,
  useFilters,
  type FilterGroup,
  type SortOption,
} from "@/components/filters";

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
  owner_id: string;
  photo_url: string | null;
  created_at: string | null;
  providerName: string | null;
  phone: string | null;
  categories: { id: string; name: string; slug: string; emoji: string | null } | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

const SORTS: SortOption[] = [
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

const DETAIL_GROUP: FilterGroup = {
  id: "details",
  label: "Listing details",
  options: [
    { value: "phone", label: "Contact number shared" },
    { value: "photo", label: "Has a photo" },
  ],
};

function ExploreInner() {
  const params = useSearchParams();
  const initialSlug = params.get("category") ?? "";
  const { showToast } = useToast();
  const filters = useFilters("name-asc");
  const { state, defaultGeo, sort, query, geoKey } = filters;

  const [tree, setTree] = useState<CategoryTreeGroup[]>([]);
  const [items, setItems] = useState<Biz[]>([]);
  const [loading, setLoading] = useState(true);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const [detailProvider, setDetailProvider] = useState<ProviderDetail | null>(null);

  const categories = useMemo<Category[]>(() => tree.flatMap((g) => g.categories), [tree]);

  // One flat category list, shared by the horizontal strip and the filter panel.
  const groups = useMemo<FilterGroup[]>(
    () => [
      ...(categories.length
        ? [
            {
              id: "category",
              label: "Category",
              searchable: categories.length > 8,
              collapseAfter: 8,
              options: categories.map((c) => ({ value: c.slug, label: c.name, icon: c.emoji })),
            },
          ]
        : []),
      DETAIL_GROUP,
    ],
    [categories],
  );

  const selectedCategories = selectedValues(state, "category");

  // Categories and the member's saved location only need to load once.
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [profRes, categoryTree] = await Promise.all([
        user
          ? visible(supabase.from("profiles").select("pincode, locality, locality_id, area, area_id"))
              .eq("id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        fetchCategoryTree(supabase),
      ]);

      const profile = profRes.data as {
        pincode: string | null;
        locality: string | null;
        locality_id: string | null;
        area: string | null;
        area_id: string | null;
      } | null;

      filters.adoptDefaultGeo(
        makeGeo({
          pincode: profile?.pincode ?? "",
          locality: profile?.locality ?? "",
          localityId: profile?.locality_id ?? null,
          areaId: profile?.area_id ?? "",
          areaName: profile?.area ?? "",
        }),
      );
      // Preselect the category passed in from the home screen tiles.
      const known = categoryTree.some((g) => g.categories.some((c) => c.slug === initialSlug));
      if (initialSlug && known) filters.toggle("category", initialSlug);
      setTree(categoryTree);
      setTreeLoaded(true);
    };
    void load().catch(() => setTreeLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one-time bootstrap

  // Providers are re-queried only when the location changes; the rest is client-side.
  useEffect(() => {
    if (!treeLoaded) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let rows = visible(
          supabase
            .from("businesses")
            .select("id, name, owner_id, photo_url, created_at, categories(id, name, slug, emoji)"),
        );

        if (state.geo.pincode.length === 6) {
          const covering = await fetchCoveringBusinessIds(supabase, {
            pincode: state.geo.pincode,
            localityId: state.geo.localityId,
            areaId: state.geo.areaId || null,
          });
          if (!covering.length) {
            if (!cancelled) setItems([]);
            return;
          }
          rows = rows.in("id", covering);
        }

        const { data: all } = await rows.order("name").limit(200);
        if (cancelled) return;
        if (!all?.length) {
          setItems([]);
          return;
        }

        const ownerIds = all.map((b: { owner_id: string }) => b.owner_id);
        const { data: profiles } = await visible(
          supabase.from("profiles").select("id, full_name, phone, pincode, address, lat, lng"),
        ).in("id", ownerIds);
        if (cancelled) return;

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

        setItems(user ? withAddr.filter((b) => b.owner_id !== user.id) : withAddr);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [treeLoaded, geoKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const slugs = selectedValues(state, "category");
    const details = selectedValues(state, "details");

    const matched = items.filter((b) => {
      if (slugs.length && !slugs.includes(b.categories?.slug ?? "")) return false;
      if (details.includes("phone") && !b.phone?.trim()) return false;
      if (details.includes("photo") && !b.photo_url?.trim()) return false;
      if (!needle) return true;
      const hay = `${b.name} ${categoryDisplayName(b.categories)} ${b.providerName ?? ""} ${
        b.address ?? ""
      }`.toLowerCase();
      return hay.includes(needle);
    });

    const byName = (a: Biz, b: Biz) => a.name.localeCompare(b.name);
    const sorters: Record<string, (a: Biz, b: Biz) => number> = {
      "name-asc": byName,
      "name-desc": (a, b) => byName(b, a),
      newest: (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "") || byName(a, b),
      oldest: (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || byName(a, b),
    };
    return [...matched].sort(sorters[sort] ?? byName);
  }, [items, query, sort, state]);

  const openDetails = (b: Biz) =>
    setDetailProvider({
      id: b.id,
      name: b.name,
      photo_url: b.photo_url,
      category: categoryDisplayName(b.categories),
      providerName: b.providerName,
      phone: b.phone,
      address: b.address,
    });

  const clearCategories = () =>
    selectedCategories.forEach((slug) => filters.toggle("category", slug));

  if (!treeLoaded) return <ExplorePageSkeleton />;

  const panel = (
    <FilterPanel
      groups={groups}
      state={state}
      defaultGeo={defaultGeo}
      onToggle={filters.toggle}
      onGeoChange={filters.setGeo}
      onClear={filters.clear}
    />
  );

  const locationHint = state.geo.pincode
    ? [state.geo.areaName, state.geo.locality, state.geo.pincode].filter(Boolean).join(", ")
    : "";

  return (
    <div className="page-pad">
      <header className="mb-4">
        <h1 className="font-display text-[19px] font-bold">Explore providers</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Browse trusted local businesses{locationHint ? ` near ${locationHint}` : " nearby"}.
        </p>
      </header>

      <div className="mb-4 space-y-3">
        <FilterToolbar
          query={query}
          onQueryChange={filters.setQuery}
          searchPlaceholder="Search providers, categories, areas…"
          sortOptions={SORTS}
          sort={sort}
          onSortChange={filters.setSort}
          filterCount={filters.filterCount}
          onOpenFilters={() => filters.setDrawerOpen(true)}
        />
        <CategoryFilterRow
          categories={categories}
          selected={selectedCategories}
          onToggle={(slug) => filters.toggle("category", slug)}
          onClear={clearCategories}
        />
        <ActiveFilterChips
          groups={groups}
          state={state}
          defaultGeo={defaultGeo}
          onToggle={filters.toggle}
          onGeoChange={filters.setGeo}
          onClear={filters.clear}
        />
      </div>

      {/* The drawer shows the same panel below `lg`; only one should be mounted. */}
      <FilterLayout sidebar={filters.drawerOpen ? null : panel}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <ResultsCount count={results.length} noun={results.length === 1 ? "provider" : "providers"} />
          <p className="hidden text-[12px] font-semibold text-ink-faint sm:block">
            {SORTS.find((s) => s.value === sort)?.label}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonProviderRow key={i} />
            ))}
          </div>
        ) : results.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((b) => {
              const category = categoryDisplayName(b.categories);
              return (
                <div
                  key={b.id}
                  role="button"
                  tabIndex={0}
                  className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-line bg-white p-4 text-left shadow-card transition hover:border-blue-deep/40"
                  onClick={() => openDetails(b)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDetails(b);
                    }
                  }}
                >
                  <BusinessAvatar name={b.name} photoUrl={b.photo_url} size={44} />
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
                        onClick={(e) => e.stopPropagation()}
                      >
                        {displayPhone(b.phone)}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-ink-faint">No contact shared</p>
                    )}
                    {b.address ? (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-faint">{b.address}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-bold text-blue-deep"
                    onClick={(e) => {
                      e.stopPropagation();
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
        ) : filters.filterCount || query.trim() ? (
          <EmptyState
            icon={Store}
            title="No providers match these filters"
            message="Try widening the location or picking a different category."
            actionLabel="Clear all filters"
            onAction={filters.clear}
          />
        ) : (
          <EmptyState
            icon={Store}
            title="No providers nearby"
            message="Check back later as more businesses join Sanyuj."
          />
        )}
      </FilterLayout>

      <FilterDrawer
        open={filters.drawerOpen}
        onClose={() => filters.setDrawerOpen(false)}
        resultCount={results.length}
        resultNoun={results.length === 1 ? "provider" : "providers"}
      >
        {panel}
      </FilterDrawer>

      <ProviderDetailSheet
        provider={detailProvider}
        open={detailProvider != null}
        onClose={() => setDetailProvider(null)}
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
