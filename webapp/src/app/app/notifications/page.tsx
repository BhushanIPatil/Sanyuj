"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NoticeDetailSheet } from "@/components/NoticeDetailSheet";
import { CategoryFilterRow, CategoryTintBadge } from "@/components/CategoryFilterRow";
import { EmptyState } from "@/components/EmptyState";
import {
  OfferlyPageSkeleton,
  Skeleton,
  SkeletonCard,
  SkeletonLine,
} from "@/components/ui/Skeleton";
import {
  fetchProfileGeo,
  fetchVisibleNotices,
  type NoticeDetail,
} from "@/lib/geo/notices";
import { fetchContentCategories, type ContentCategory } from "@/lib/contentCategories";
import { formatWhenRange } from "@/lib/formatWhen";
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
  withinNextDays,
  withinPastDays,
  type FilterGroup,
  type SortOption,
} from "@/components/filters";

const SORTS: SortOption[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "ending", label: "Ending soonest" },
  { value: "title", label: "Title: A to Z" },
];

const TIMING_GROUP: FilterGroup = {
  id: "timing",
  label: "Timing",
  options: [
    { value: "ending-3", label: "Ending in 3 days" },
    { value: "ending-7", label: "Ending in 7 days" },
    { value: "ongoing", label: "No end date" },
    { value: "new", label: "Posted this week" },
  ],
};

const EXTRA_GROUP: FilterGroup = {
  id: "extras",
  label: "More",
  options: [
    { value: "photo", label: "Has a photo" },
    { value: "details", label: "Has full details" },
  ],
};

function NoticeCard({ notice, onOpen }: { notice: NoticeDetail; onOpen: (notice: NoticeDetail) => void }) {
  const when = formatWhenRange(notice.event_starts_at, notice.event_ends_at);

  return (
    <button
      type="button"
      onClick={() => onOpen(notice)}
      className="overflow-hidden rounded-[16px] border border-line bg-white text-left shadow-card transition hover:border-blue-deep/30"
    >
      {notice.image_url ? (
        <div className="overflow-hidden bg-surface" style={{ aspectRatio: "2.4 / 1" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={notice.image_url} alt="" className="h-full w-full object-contain object-center" />
        </div>
      ) : null}
      <div className="p-4">
        {notice.category ? (
          <div className="mb-2">
            <CategoryTintBadge category={notice.category} />
          </div>
        ) : null}
        <h2 className="font-display text-base font-extrabold leading-snug text-ink">{notice.title}</h2>
        {notice.body ? <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink-soft">{notice.body}</p> : null}
        {when ? <p className="mt-2 text-[11px] font-semibold text-ink-faint">{when}</p> : null}
      </div>
    </button>
  );
}

function NoticeSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} className="overflow-hidden p-0">
          <Skeleton className="h-[140px] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <SkeletonLine width="70%" className="h-4" />
            <SkeletonLine width="90%" className="h-2.5" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const filters = useFilters("featured");
  const { state, defaultGeo, sort, query, geoKey } = filters;

  const [notices, setNotices] = useState<NoticeDetail[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [detail, setDetail] = useState<NoticeDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [geo, cats] = await Promise.all([
        fetchProfileGeo(supabase),
        fetchContentCategories(supabase, "notice").catch(() => [] as ContentCategory[]),
      ]);
      filters.adoptDefaultGeo(
        makeGeo({
          pincode: geo.pincode ?? "",
          locality: geo.locality ?? "",
          localityId: geo.localityId,
          areaId: geo.areaId ?? "",
          areaName: geo.area ?? "",
        }),
      );
      setCategories(cats);
      setReady(true);
    };
    void load().catch(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one-time bootstrap

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchVisibleNotices(createClient(), {
          pincode: state.geo.pincode || null,
          localityId: state.geo.localityId,
          areaId: state.geo.areaId || null,
        });
        if (!cancelled) setNotices(data);
      } catch {
        if (!cancelled) setNotices([]);
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

  const groups = useMemo(
    () => [categoryGroup, TIMING_GROUP, EXTRA_GROUP].filter((g): g is FilterGroup => g != null),
    [categoryGroup],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const timing = selectedValues(state, "timing");
    const extras = selectedValues(state, "extras");
    const categorySlugs = selectedValues(state, "category");

    const matchesTiming = (notice: NoticeDetail) =>
      timing.some((value) => {
        if (value === "ending-3") return withinNextDays(notice.event_ends_at, 3);
        if (value === "ending-7") return withinNextDays(notice.event_ends_at, 7);
        if (value === "ongoing") return !notice.event_ends_at;
        if (value === "new") return withinPastDays(notice.created_at, 7);
        return false;
      });

    const matched = notices.filter((notice) => {
      if (categorySlugs.length && !categorySlugs.includes(notice.category?.slug ?? "")) return false;
      if (timing.length && !matchesTiming(notice)) return false;
      if (extras.includes("photo") && !notice.image_url?.trim()) return false;
      if (extras.includes("details") && !notice.body?.trim()) return false;
      if (!needle) return true;
      return `${notice.title} ${notice.body ?? ""} ${notice.category?.name ?? ""}`.toLowerCase().includes(needle);
    });

    const far = "9999-12-31";
    const sorters: Record<string, (a: NoticeDetail, b: NoticeDetail) => number> = {
      featured: () => 0,
      newest: (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      oldest: (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""),
      ending: (a, b) => (a.event_ends_at ?? far).localeCompare(b.event_ends_at ?? far),
      title: (a, b) => a.title.localeCompare(b.title),
    };
    return [...matched].sort(sorters[sort] ?? sorters.featured);
  }, [notices, query, sort, state]);

  if (!ready) return <OfferlyPageSkeleton label="Loading Notify" />;

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

  const noun = results.length === 1 ? "update" : "updates";
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
        <h1 className="font-display text-[19px] font-bold">Notify</h1>
        <p className="mt-1 text-sm text-ink-soft">Events and updates for your area.</p>
      </header>

      <div className="mb-4 space-y-3">
        <FilterToolbar
          query={query}
          onQueryChange={filters.setQuery}
          searchPlaceholder="Search events, functions…"
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
          <NoticeSkeletonGrid />
        ) : results.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} onOpen={setDetail} />
            ))}
          </div>
        ) : filters.filterCount || query.trim() ? (
          <EmptyState
            icon={Bell}
            title="No updates match these filters"
            message="Try clearing the category or timing filters, or widening the location."
            actionLabel="Clear all filters"
            onAction={filters.clear}
          />
        ) : (
          <EmptyState
            icon={Bell}
            title="No updates nearby"
            message="Events and local updates for your area will show up here."
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

      <NoticeDetailSheet notice={detail} open={detail != null} onClose={() => setDetail(null)} />
    </div>
  );
}
