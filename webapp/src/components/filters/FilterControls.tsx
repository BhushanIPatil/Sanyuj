"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { LocalityPicker } from "@/components/LocalityPicker";
import { AreaPicker } from "@/components/AreaPicker";
import { createClient } from "@/lib/supabase/client";
import { resolveLocalityId } from "@/lib/geo/localities";
import {
  activeFilterCount,
  geoLabel,
  isSelected,
  sameGeo,
  selectedValues,
  type FilterGroup,
  type FilterState,
  type GeoFilter,
  type SortOption,
} from "./types";

type GeoUpdater = (updater: (prev: GeoFilter) => GeoFilter) => void;

function Section({
  title,
  icon,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        {icon ? <span className="text-ink-faint">{icon}</span> : null}
        <span className="flex-1 text-[13px] font-extrabold text-ink">{title}</span>
        {badge ? (
          <span className="rounded-full bg-blue-soft px-2 py-0.5 text-[10px] font-extrabold text-blue-deep">
            {badge}
          </span>
        ) : null}
        <ChevronDown
          size={16}
          className={`text-ink-faint transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}

function OptionRow({
  label,
  icon,
  count,
  checked,
  onToggle,
}: {
  label: string;
  icon?: string | null;
  count?: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onToggle} />
      <span
        aria-hidden
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition ${
          checked ? "border-blue-deep bg-blue-deep text-white" : "border-line bg-white text-transparent"
        } peer-focus-visible:ring-2 peer-focus-visible:ring-blue-deep/40`}
      >
        <Check size={12} strokeWidth={3} />
      </span>
      {icon ? <CategoryIcon value={icon} alt="" size="chip" /> : null}
      <span
        className={`min-w-0 flex-1 truncate text-[13px] ${
          checked ? "font-bold text-ink" : "font-semibold text-ink-soft"
        }`}
      >
        {label}
      </span>
      {typeof count === "number" ? (
        <span className="shrink-0 text-[11px] font-semibold text-ink-faint">{count}</span>
      ) : null}
    </label>
  );
}

function GroupSection({
  group,
  state,
  onToggle,
}: {
  group: FilterGroup;
  state: FilterState;
  onToggle: (groupId: string, value: string) => void;
}) {
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const selected = selectedValues(state, group.id);

  const matching = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return group.options;
    return group.options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [group.options, q]);

  const limit = group.collapseAfter ?? 8;
  const visibleOptions = showAll || q.trim() ? matching : matching.slice(0, limit);
  const hiddenCount = matching.length - visibleOptions.length;

  if (!group.options.length) return null;

  return (
    <Section title={group.label} badge={selected.length}>
      {group.searchable && group.options.length > limit ? (
        <div className="mb-2 flex items-center gap-2 rounded-[12px] border border-line bg-surface px-3 py-2">
          <Search size={14} className="shrink-0 text-ink-faint" />
          <input
            className="w-full bg-transparent text-[13px] outline-none"
            placeholder={`Search ${group.label.toLowerCase()}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      ) : null}

      <div className="max-h-[260px] overflow-y-auto pr-1">
        {visibleOptions.length ? (
          visibleOptions.map((o) => (
            <OptionRow
              key={o.value}
              label={o.label}
              icon={o.icon}
              count={o.count}
              checked={isSelected(state, group.id, o.value)}
              onToggle={() => onToggle(group.id, o.value)}
            />
          ))
        ) : (
          <p className="py-1 text-[12px] text-ink-faint">No matches</p>
        )}
      </div>

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1.5 text-[12px] font-bold text-blue-deep"
        >
          + {hiddenCount} more
        </button>
      ) : null}
    </Section>
  );
}

/** Pincode → locality → area, defaulting to the signed-in member's saved location. */
export function GeoFilterFields({
  geo,
  setGeo,
  defaultGeo,
}: {
  geo: GeoFilter;
  setGeo: GeoUpdater;
  defaultGeo: GeoFilter;
}) {
  const { pincode, locality } = geo;

  useEffect(() => {
    if (pincode.length !== 6 || !locality.trim()) {
      setGeo((prev) => (prev.localityId === null ? prev : { ...prev, localityId: null }));
      return;
    }
    let cancelled = false;
    void resolveLocalityId(createClient(), pincode, locality).then((id) => {
      if (cancelled) return;
      setGeo((prev) => (prev.localityId === id ? prev : { ...prev, localityId: id }));
    });
    return () => {
      cancelled = true;
    };
  }, [pincode, locality, setGeo]);

  const customised = !sameGeo(geo, defaultGeo);

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-ink-soft">Pincode</label>
      <input
        className="input-box !py-2.5 font-mono text-[13.5px]"
        inputMode="numeric"
        maxLength={6}
        placeholder="Any pincode"
        value={pincode}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, 6);
          setGeo(() => ({ pincode: next, locality: "", localityId: null, areaId: "", areaName: "" }));
        }}
      />

      {pincode.length === 6 ? (
        <>
          <p className="pt-2 text-[11px] font-bold text-ink-soft">Locality</p>
          <LocalityPicker
            pincode={pincode}
            value={locality}
            onChange={(name) =>
              setGeo((prev) => ({ ...prev, locality: name, localityId: null, areaId: "", areaName: "" }))
            }
          />
          {locality.trim() ? (
            <>
              <p className="pt-2 text-[11px] font-bold text-ink-soft">Area / colony</p>
              <AreaPicker
                pincode={pincode}
                locality={locality}
                value={geo.areaId}
                onChange={(areaId, areaName) => setGeo((prev) => ({ ...prev, areaId, areaName }))}
              />
            </>
          ) : null}
        </>
      ) : (
        <p className="pt-1 text-[12px] text-ink-soft">
          Enter a 6-digit pincode to narrow down by locality and area.
        </p>
      )}

      {customised ? (
        <button
          type="button"
          onClick={() => setGeo(() => defaultGeo)}
          className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-deep"
        >
          <RotateCcw size={13} />
          {defaultGeo.pincode ? `Back to ${geoLabel(defaultGeo)}` : "Clear location"}
        </button>
      ) : null}
    </div>
  );
}

export function FilterPanel({
  groups,
  state,
  defaultGeo,
  onToggle,
  onGeoChange,
  onClear,
}: {
  groups: FilterGroup[];
  state: FilterState;
  defaultGeo: GeoFilter;
  onToggle: (groupId: string, value: string) => void;
  onGeoChange: GeoUpdater;
  onClear: () => void;
}) {
  const count = activeFilterCount(state, defaultGeo);
  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <SlidersHorizontal size={15} className="text-blue-deep" />
        <p className="flex-1 font-display text-sm font-extrabold">Filters</p>
        <button
          type="button"
          onClick={onClear}
          disabled={!count}
          className="text-[12px] font-bold text-blue-deep disabled:text-ink-faint"
        >
          Clear all
        </button>
      </div>

      <Section title="Location" icon={<MapPin size={14} />} badge={sameGeo(state.geo, defaultGeo) ? 0 : 1}>
        <GeoFilterFields geo={state.geo} setGeo={onGeoChange} defaultGeo={defaultGeo} />
      </Section>

      {groups.map((group) => (
        <GroupSection key={group.id} group={group} state={state} onToggle={onToggle} />
      ))}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-deep/25 bg-blue-soft py-1.5 pl-3 pr-2 text-[12px] font-bold text-blue-deep">
      {label}
      <button type="button" aria-label={`Remove ${label}`} onClick={onRemove} className="opacity-70 hover:opacity-100">
        <X size={13} strokeWidth={2.5} />
      </button>
    </span>
  );
}

export function ActiveFilterChips({
  groups,
  state,
  defaultGeo,
  onToggle,
  onGeoChange,
  onClear,
}: {
  groups: FilterGroup[];
  state: FilterState;
  defaultGeo: GeoFilter;
  onToggle: (groupId: string, value: string) => void;
  onGeoChange: GeoUpdater;
  onClear: () => void;
}) {
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

  if (!sameGeo(state.geo, defaultGeo)) {
    if (state.geo.pincode) {
      chips.push({
        key: "geo-pincode",
        label: state.geo.pincode,
        onRemove: () => onGeoChange(() => defaultGeo),
      });
    }
    if (state.geo.locality) {
      chips.push({
        key: "geo-locality",
        label: state.geo.locality,
        onRemove: () =>
          onGeoChange((prev) => ({ ...prev, locality: "", localityId: null, areaId: "", areaName: "" })),
      });
    }
    if (state.geo.areaName) {
      chips.push({
        key: "geo-area",
        label: state.geo.areaName,
        onRemove: () => onGeoChange((prev) => ({ ...prev, areaId: "", areaName: "" })),
      });
    }
  }

  for (const group of groups) {
    for (const value of selectedValues(state, group.id)) {
      // Options can vanish when the location changes (brands, for example), so
      // fall back to the raw value to keep the chip removable.
      const option = group.options.find((o) => o.value === value);
      chips.push({
        key: `${group.id}:${value}`,
        label: option?.label ?? value,
        onRemove: () => onToggle(group.id, value),
      });
    }
  }

  if (!chips.length) return null;

  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
      ))}
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-full px-2 py-1.5 text-[12px] font-bold text-ink-soft underline"
      >
        Clear all
      </button>
    </div>
  );
}

export function FilterToolbar({
  query,
  onQueryChange,
  searchPlaceholder,
  sortOptions,
  sort,
  onSortChange,
  filterCount,
  onOpenFilters,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  sortOptions: SortOption[];
  sort: string;
  onSortChange: (value: string) => void;
  filterCount: number;
  onOpenFilters: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-2.5 rounded-[16px] border-[1.5px] border-line bg-white px-4 py-3 shadow-card">
        <Search size={16} className="shrink-0 text-ink-faint" />
        <input
          className="w-full bg-transparent text-sm outline-none"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query ? (
          <button type="button" aria-label="Clear search" onClick={() => onQueryChange("")}>
            <X size={15} className="text-ink-faint" />
          </button>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenFilters}
          className="relative inline-flex items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-white px-4 py-3 text-sm font-bold text-ink shadow-card lg:hidden"
        >
          <SlidersHorizontal size={15} className="text-blue-deep" />
          Filters
          {filterCount ? (
            <span className="rounded-full bg-blue-deep px-1.5 py-0.5 text-[10px] font-extrabold text-white">
              {filterCount}
            </span>
          ) : null}
        </button>

        <label className="inline-flex flex-1 items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-white px-3.5 py-3 shadow-card sm:flex-none">
          <ArrowUpDown size={15} className="shrink-0 text-blue-deep" />
          <span className="sr-only">Sort by</span>
          <select
            className="w-full cursor-pointer bg-transparent text-sm font-bold text-ink outline-none"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export function FilterDrawer({
  open,
  onClose,
  resultCount,
  resultNoun,
  children,
}: {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  resultNoun: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-[min(92vw,380px)] flex-col bg-bg-page shadow-pop">
        <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-3">
          <p className="flex-1 font-display text-base font-extrabold">Filters</p>
          <button type="button" aria-label="Close filters" onClick={onClose}>
            <X size={18} className="text-ink-soft" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
        <div className="border-t border-line bg-white p-3">
          <button type="button" onClick={onClose} className="btn-primary !py-3.5">
            Show {resultCount} {resultNoun}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sidebar + results grid. The sidebar collapses into `FilterDrawer` below `lg`. */
export function FilterLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-6">
      <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto lg:block">
        {sidebar}
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ResultsCount({ count, noun }: { count: number; noun: string }) {
  return (
    <p className="text-[12.5px] font-semibold text-ink-soft">
      <span className="font-extrabold text-ink">{count}</span> {noun}
    </p>
  );
}
