"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { detectLocation } from "@/lib/geo/location";
import { EMPTY_GEO, type GeoFilter } from "@/components/filters/types";
const LocationContext = createContext({ geo: EMPTY_GEO, address: "", refresh: async () => {} });
export function UserLocationProvider({ children }: { children: React.ReactNode }) {
  const [geo, setGeo] = useState<GeoFilter>(EMPTY_GEO);
  const [address, setAddress] = useState("");
  const busy = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const fix = await detectLocation();
      if (!mounted.current) return;
      setAddress(fix.address);
      if (fix.pincode) setGeo(previous => previous.pincode === fix.pincode ? previous : { ...EMPTY_GEO, pincode: fix.pincode! });
    } catch {
      // Leave manual location filters available when permission or GPS is unavailable.
    } finally { busy.current = false; }
  }, []);
  useEffect(() => {
    mounted.current = true;
    // Subscribe to browser location when the app mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(onVisible, 120000);
    document.addEventListener("visibilitychange", onVisible);
    return () => { mounted.current = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);
  return <LocationContext.Provider value={{ geo, address, refresh }}>{children}</LocationContext.Provider>;
}
export const useUserLocation = () => useContext(LocationContext);
