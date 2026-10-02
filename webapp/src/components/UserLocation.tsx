"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { detectLocation } from "@/lib/geo/location";
import { EMPTY_GEO, type GeoFilter } from "@/components/filters/types";
const LocationContext = createContext<{
  geo: GeoFilter;
  address: string;
  manual: boolean;
  selectGeo: (geo: GeoFilter) => void;
  refresh: () => Promise<void>;
}>({ geo: EMPTY_GEO, address: "", manual: false, selectGeo: () => {}, refresh: async () => {} });
export function UserLocationProvider({ children }: { children: React.ReactNode }) {
  const [geo, setGeo] = useState<GeoFilter>(EMPTY_GEO);
  const [address, setAddress] = useState("");
  const [manual, setManual] = useState(false);
  const manualRef = useRef(false);
  const selectGeo = useCallback((next: GeoFilter) => {
    manualRef.current = true;
    setManual(true);
    setGeo(next);
  }, []);
  const busy = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const fix = await detectLocation();
      if (!mounted.current || manualRef.current) return;
      setAddress(fix.address);
      if (fix.pincode) setGeo(previous => previous.pincode === fix.pincode ? previous : { ...EMPTY_GEO, pincode: fix.pincode! });
    } catch {
      // Leave manual location filters available when permission or GPS is unavailable.
    } finally { busy.current = false; }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return <LocationContext.Provider value={{ geo, address, manual, selectGeo, refresh }}>{children}</LocationContext.Provider>;
}
export const useUserLocation = () => useContext(LocationContext);
