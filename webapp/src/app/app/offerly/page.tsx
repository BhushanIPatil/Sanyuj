"use client";

import { useEffect, useMemo, useState } from "react";
import { Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AdDetailSheet } from "@/components/AdDetailSheet";
import { CategoryFilterRow, CategoryTintBadge } from "@/components/CategoryFilterRow";
import { EmptyState } from "@/components/EmptyState";
import {
  OfferlyPageSkeleton,
  Skeleton,
  SkeletonCard,
  SkeletonLine,
} from "@/components/ui/Skeleton";
import {
  AD_BANNER_ASPECT,
  fetchVisibleAds,
  type AdDetail,
} from "@/lib/geo/ads";
import { formatWhenRange } from "@/lib/formatWhen";
import { fetchContentCategories, type ContentCategory } from "@/lib/contentCategories";
import {
  ActiveFilterChips,
  FilterDrawer,
  FilterLayout,
  FilterPanel,
  FilterToolbar,
  ResultsCount,
  isFuture,
  isRunningNow,
  selectedValues,
  useFilters,
  withinNextDays,
  withinPastDays,
  type FilterGroup,
  type SortOption,
} from "@/components/filters";

const DEFAULT_BG = "linear-gradient(135deg,#2E86D6,#3B5BDB)";

const SORTS: SortOption[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "ending", label: "Ending soonest" },
  { value: "brand", label: "Brand: A to Z" },
];

const STATUS_GROUP: FilterGroup = {
  id: "status",
  label: "Offer status",
  options: [
    { value: "live", label: "Running now" },
    { value: "upcoming", label: "Starting soon" },
    { value: "ending", label: "Ending in 7 days" },
    { value: "open", label: "No end date" },
  ],
};

const EXTRA_GROUP: FilterGroup = {
  id: "extras",
  label: "More",
  options: [
    { value: "new", label: "Added this week" },
    { value: "cta", label: "Has an action link" },
    { value: "photo", label: "Has a photo" },
  ],
};

function OfferlyCard({ ad, onOpen }: { ad: AdDetail; onOpen: (ad: AdDetail) => void }) {
  const hasImage = Boolean(ad.image_url?.trim());
  const when = formatWhenRange(ad.offer_starts_at, ad.offer_ends_at);

  return (
    <button
      type="button"
      onClick={() => onOpen(ad)}
      className="overflow-hidden rounded-[16px] border border-line bg-white text-left shadow-card transition hover:border-blue-deep/30"
    >
      <div className="overflow-hidden bg-surface" style={{ aspectRatio: AD_BANNER_ASPECT, borderRadius: 0 }}>
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.image_url!} alt="" className="h-full w-full object-contain object-center" />
        ) : (
          <div
            className="flex h-full w-full flex-col justify-end p-4 text-white"
            style={{ background: ad.background || DEFAULT_BG }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-85">{ad.brand_name}</span>
            <h3 className="mt-1 font-display text-lg font-bold leading-snug">{ad.title}</h3>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex rounded-full bg-blue-soft px-2.5 py-1 text-[11px] font-bold text-blue-deep">
            {ad.brand_name || "Sponsored"}
          </span>
          {ad.category ? <CategoryTintBadge category={ad.category} /> : null}
        </div>
        <h2 className="mt-2 font-display text-base font-extrabold leading-snug text-ink">{ad.title}</h2>
        {when ? <p className="mt-2 text-[11px] font-semibold text-ink-faint">{when}</p> : null}
      </div>
    </button>
  );
}

function OfferSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} className="overflow-hidden p-0">
          <Skeleton className="h-[160px] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <SkeletonLine width="5rem" className="h-3" />
            <SkeletonLine width="80%" className="h-4" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export default function OfferlyPage() {
  const filters = useFilters("featured");
  const { state, defaultGeo, sort, query, geoKey } = filters;

  const [ads, setAds] = useState<AdDetail[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [detailAd, setDetailAd] = useState<AdDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const cats = await fetchContentCategories(supabase, "offer").catch(() => [] as ContentCategory[]);
      setCategories(cats);
      setReady(true);
    };
    void load().catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchVisibleAds(createClient(), {
          pincode: state.geo.pincode || null,
          localityId: state.geo.localityId,
          areaId: state.geo.areaId || null,
        });
        if (!cancelled) setAds(data);
      } catch {
        if (!cancelled) setAds([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, geoKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const categoryGroup: FilterGroup | null = useMemo(
    () =>
      categories.length
        ? {
            id: "category",
            label: "Category",
            searchable: categories.length > 8,
            collapseAfter: 8,
            options: categories.map((c) => ({ value: c.slug, label: c.name, icon: c.emoji })),
          }
        : null,
    [categories],
  );

  const brandGroup: FilterGroup = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ad of ads) {
      const brand = ad.brand_name?.trim();
      if (!brand) continue;
      counts.set(brand, (counts.get(brand) ?? 0) + 1);
    }
    return {
      id: "brand",
      label: "Brand",
      searchable: true,
      collapseAfter: 6,
      options: [...counts.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([brand, count]) => ({ value: brand, label: brand, count })),
    };
  }, [ads]);

  const groups = useMemo(
    () => [categoryGroup, brandGroup, STATUS_GROUP, EXTRA_GROUP].filter((g): g is FilterGroup => g != null),
    [categoryGroup, brandGroup],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const brands = selectedValues(state, "brand");
    const statuses = selectedValues(state, "status");
    const extras = selectedValues(state, "extras");
    const categorySlugs = selectedValues(state, "category");

    const matchesStatus = (ad: AdDetail) =>
      statuses.some((status) => {
        if (status === "live") return isRunningNow(ad.offer_starts_at, ad.offer_ends_at);
        if (status === "upcoming") return isFuture(ad.offer_starts_at);
        if (status === "ending") return withinNextDays(ad.offer_ends_at, 7);
        if (status === "open") return !ad.offer_ends_at;
        return false;
      });

    const matched = ads.filter((ad) => {
      if (categorySlugs.length && !categorySlugs.includes(ad.category?.slug ?? "")) return false;
      if (brands.length && !brands.includes(ad.brand_name?.trim() ?? "")) return false;
      if (statuses.length && !matchesStatus(ad)) return false;
      if (extras.includes("new") && !withinPastDays(ad.created_at, 7)) return false;
      if (extras.includes("cta") && !ad.cta_url?.trim()) return false;
      if (extras.includes("photo") && !ad.image_url?.trim()) return false;
      if (!needle) return true;
      return `${ad.brand_name} ${ad.title} ${ad.body ?? ""} ${ad.category?.name ?? ""}`.toLowerCase().includes(needle);
    });

    const far = "9999-12-31";
    const sorters: Record<string, (a: AdDetail, b: AdDetail) => number> = {
      featured: () => 0,
      newest: (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      oldest: (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""),
      ending: (a, b) => (a.offer_ends_at ?? far).localeCompare(b.offer_ends_at ?? far),
      brand: (a, b) => a.brand_name.localeCompare(b.brand_name),
    };
    return [...matched].sort(sorters[sort] ?? sorters.featured);
  }, [ads, query, sort, state]);

  const openAd = (ad: AdDetail) => {
    setDetailAd(ad);
  };

  if (!ready) return <OfferlyPageSkeleton />;

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

  const noun = results.length === 1 ? "offer" : "offers";
  const selectedCategories = selectedValues(state, "category");
  const pickListingCategory = (slug: string) => {
    if (selectedCategories.length === 1 && selectedCategories[0] === slug) {
      filters.clearGroup("category");
      return;
    }
    filters.selectOnly("category", slug);
  };

  return (
    <div className="page-pad">
      <header className="mb-4">
        <h1 className="font-display text-[19px] font-bold">Offerly</h1>
        <p className="mt-1 text-sm text-ink-soft">All offers and ads for your area, in one place.</p>
      </header>

      <div className="mb-4 space-y-3">
        <FilterToolbar
          query={query}
          onQueryChange={filters.setQuery}
          searchPlaceholder="Search offers, brands…"
          sortOptions={SORTS}
          sort={sort}
          onSortChange={filters.setSort}
          filterCount={filters.filterCount}
          onOpenFilters={() => filters.setDrawerOpen(true)}
        />
        <CategoryFilterRow
          categories={categories}
          selected={selectedCategories}
          onToggle={pickListingCategory}
          onClear={() => filters.clearGroup("category")}
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
          <ResultsCount count={results.length} noun={noun} />
          <p className="hidden text-[12px] font-semibold text-ink-faint sm:block">
            {SORTS.find((s) => s.value === sort)?.label}
          </p>
        </div>

        {loading ? (
          <OfferSkeletonGrid />
        ) : results.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((ad) => (
              <OfferlyCard key={ad.id} ad={ad} onOpen={openAd} />
            ))}
          </div>
        ) : filters.filterCount || query.trim() ? (
          <EmptyState
            icon={Tag}
            title="No offers match these filters"
            message="Try clearing the offer status, category, or brand filters, or widening the location."
            actionLabel="Clear all filters"
            onAction={filters.clear}
          />
        ) : (
          <EmptyState
            icon={Tag}
            title="No offers nearby"
            message="Featured offers for your area will show up here. Check back soon."
          />
        )}
      </FilterLayout>

      <FilterDrawer
        open={filters.drawerOpen}
        onClose={() => filters.setDrawerOpen(false)}
        resultCount={results.length}
        resultNoun={noun}
      >
        {panel}
      </FilterDrawer>

      <AdDetailSheet ad={detailAd} open={detailAd != null} onClose={() => setDetailAd(null)} />
    </div>
  );
}
