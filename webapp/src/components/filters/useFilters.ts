"use client";

import { useCallback, useRef, useState } from "react";
import {
  EMPTY_GEO,
  activeFilterCount,
  makeFilterState,
  sameGeo,
  toggleFilter,
  selectOnlyFilter,
  clearFilterGroup,
  type FilterState,
  type GeoFilter,
} from "./types";

/**
 * Filter/sort/search state for a listing page.
 *
 * The member's saved location seeds the location filter, so call
 * `adoptDefaultGeo` once the profile resolves — it only overwrites the current
 * selection while the visitor is still on the default location.
 */
export function useFilters(defaultSort: string) {
  const [state, setState] = useState<FilterState>(() => makeFilterState(EMPTY_GEO));
  const [defaultGeo, setDefaultGeo] = useState<GeoFilter>(EMPTY_GEO);
  const [sort, setSort] = useState(defaultSort);
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const defaultGeoRef = useRef<GeoFilter>(EMPTY_GEO);

  const adoptDefaultGeo = useCallback((geo: GeoFilter) => {
    const previous = defaultGeoRef.current;
    defaultGeoRef.current = geo;
    setDefaultGeo(geo);
    setState((prev) => (sameGeo(prev.geo, previous) ? { ...prev, geo } : prev));
  }, []);

  const toggle = useCallback((groupId: string, value: string) => {
    setState((prev) => toggleFilter(prev, groupId, value));
  }, []);

  const selectOnly = useCallback((groupId: string, value: string) => {
    setState((prev) => selectOnlyFilter(prev, groupId, value));
  }, []);

  const clearGroup = useCallback((groupId: string) => {
    setState((prev) => clearFilterGroup(prev, groupId));
  }, []);

  const setGeo = useCallback((updater: (prev: GeoFilter) => GeoFilter) => {
    setState((prev) => {
      const geo = updater(prev.geo);
      return geo === prev.geo ? prev : { ...prev, geo };
    });
  }, []);

  const clear = useCallback(() => {
    setState(makeFilterState(defaultGeoRef.current));
    setQuery("");
  }, []);

  const { geo } = state;

  return {
    state,
    defaultGeo,
    sort,
    setSort,
    query,
    setQuery,
    drawerOpen,
    setDrawerOpen,
    adoptDefaultGeo,
    toggle,
    selectOnly,
    clearGroup,
    setGeo,
    clear,
    filterCount: activeFilterCount(state, defaultGeo),
    /** Stable dependency for refetching when the location changes. */
    geoKey: `${geo.pincode}|${geo.localityId ?? ""}|${geo.areaId}`,
  };
}
