/** Shared filter/sort model used by Offerly and Notifications. */

export type FilterOption = {
  value: string;
  label: string;
  /** Emoji character or image URL rendered before the label. */
  icon?: string | null;
  /** Number of matching items, shown next to the label. */
  count?: number;
};

export type FilterGroup = {
  id: string;
  label: string;
  options: FilterOption[];
  /** Adds a search box above the options — use for long lists such as categories. */
  searchable?: boolean;
  /** Options beyond this are hidden behind a "show all" toggle. */
  collapseAfter?: number;
};

export type SortOption = {
  value: string;
  label: string;
};

/** Pincode → locality → area, matching the `*_covering` RPC parameters. */
export type GeoFilter = {
  pincode: string;
  locality: string;
  localityId: string | null;
  areaId: string;
  areaName: string;
};

export type FilterState = {
  selections: Record<string, string[]>;
  geo: GeoFilter;
};

export const EMPTY_GEO: GeoFilter = {
  pincode: "",
  locality: "",
  localityId: null,
  areaId: "",
  areaName: "",
};

export function makeGeo(partial: Partial<GeoFilter>): GeoFilter {
  return { ...EMPTY_GEO, ...partial };
}

export function makeFilterState(geo: GeoFilter = EMPTY_GEO): FilterState {
  return { selections: {}, geo };
}

export function selectedValues(state: FilterState, groupId: string): string[] {
  return state.selections[groupId] ?? [];
}

export function isSelected(state: FilterState, groupId: string, value: string): boolean {
  return selectedValues(state, groupId).includes(value);
}

export function toggleFilter(state: FilterState, groupId: string, value: string): FilterState {
  const current = selectedValues(state, groupId);
  if (groupId === "dateRange") {
    const selections = { ...state.selections };
    if (!value || current.includes(value)) delete selections[groupId];
    else selections[groupId] = [value];
    return { ...state, selections };
  }
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  const selections = { ...state.selections };
  if (next.length) selections[groupId] = next;
  else delete selections[groupId];
  return { ...state, selections };
}

/** Listing chips pick one value. Filter panels still use [toggleFilter]. */
export function selectOnlyFilter(state: FilterState, groupId: string, value: string): FilterState {
  return { ...state, selections: { ...state.selections, [groupId]: [value] } };
}

export function clearFilterGroup(state: FilterState, groupId: string): FilterState {
  const selections = { ...state.selections };
  delete selections[groupId];
  return { ...state, selections };
}

export function sameGeo(a: GeoFilter, b: GeoFilter): boolean {
  return (
    a.pincode === b.pincode &&
    a.locality === b.locality &&
    a.localityId === b.localityId &&
    a.areaId === b.areaId
  );
}

/** Number of chips shown on the "Filters" button — geo counts as one. */
export function activeFilterCount(state: FilterState, defaultGeo: GeoFilter): number {
  const facets = Object.values(state.selections).reduce((sum, list) => sum + list.length, 0);
  return facets + (sameGeo(state.geo, defaultGeo) ? 0 : 1);
}

export function hasActiveFilters(state: FilterState, defaultGeo: GeoFilter): boolean {
  return activeFilterCount(state, defaultGeo) > 0;
}

/** Human label for the current location, e.g. "Kothrud, 411038". */
export function geoLabel(geo: GeoFilter): string {
  const parts = [geo.areaName, geo.locality, geo.pincode].filter((p) => p && p.trim());
  return parts.length ? parts.join(", ") : "Anywhere";
}
