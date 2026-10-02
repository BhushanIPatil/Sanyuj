"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { EMPTY_GEO, GeoFilterFields, geoLabel, sameGeo, type GeoFilter } from "@/components/filters";
import { usePathname } from "next/navigation";
import { Bell, ClipboardPlus, Grid2X2, LocateFixed, Sun, Tag } from "lucide-react";
import { useUserLocation } from "@/components/UserLocation";
import { detectLocation } from "@/lib/geo/location";
import { SiteFooter } from "@/components/SiteFooter";
import { SanyujBrand } from "@/components/SanyujLogo";

export const APP_NAV = [
  { href: "/app/offerly", label: "Offerly", icon: Tag },
  { href: "/app/notifications", label: "Notify", icon: Bell },
  { href: "/app/requests", label: "Share", icon: ClipboardPlus },
  { href: "/app/sanyuj", label: "Sanyuj", icon: Grid2X2 },
] as const;

function NavLinks({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  return APP_NAV.map(({ href, label, icon: Icon }) => {
    const active = pathname.startsWith(href);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}
      className={
        (mobile ? "flex min-h-14 min-w-0 flex-1 flex-col justify-center gap-1 text-[11px] " : "inline-flex gap-1.5 px-3 py-2 text-sm ") +
        "items-center rounded-xl font-semibold transition " +
        (active ? "bg-blue-deep text-white" : "text-ink-soft hover:bg-surface hover:text-ink")
      }>
      <Icon size={mobile ? 21 : 16} aria-hidden="true" />
      <span>{label}</span>
    </Link>;
  });
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address, geo, manual, selectGeo } = useUserLocation();
  const locationDialog = useRef<HTMLDialogElement>(null);
  const [draftGeo, setDraftGeo] = useState<GeoFilter>(EMPTY_GEO);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [detectedLocation, setDetectedLocation] = useState<{ geo: GeoFilter; address: string } | null>(null);
  const locationRequest = useRef(0);
  const openLocation = () => {
    locationRequest.current += 1;
    setDraftGeo(geo);
    setLocating(false);
    setLocationError("");
    setDetectedLocation(null);
    locationDialog.current?.showModal();
  };
  const handleCurrentLocation = async () => {
    if (locating) return;
    const request = ++locationRequest.current;
    setLocating(true);
    setLocationError("");
    setDetectedLocation(null);
    try {
      const fix = await detectLocation();
      if (request !== locationRequest.current || !locationDialog.current?.open) return;
      if (!fix.pincode) throw new Error("Could not find your pincode. Choose your area manually.");
      const detectedGeo = { ...EMPTY_GEO, pincode: fix.pincode };
      setDraftGeo(detectedGeo);
      setDetectedLocation({ geo: detectedGeo, address: fix.address || fix.pincode });
    } catch (error) {
      if (request === locationRequest.current && locationDialog.current?.open) {
        setLocationError(error instanceof Error ? error.message : "Location is unavailable. Choose your area manually.");
      }
    } finally {
      if (request === locationRequest.current) setLocating(false);
    }
  };
  const addressLine = manual && geo.pincode ? geoLabel(geo) : address || "Choose your area";

  return <div className="flex min-h-screen flex-col bg-bg-page pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 lg:h-16 lg:px-6">
        <SanyujBrand href="/app" size={44} light showName nameClassName="hidden font-display text-xl font-extrabold tracking-tight text-ink sm:block" priority />
        <nav aria-label="Main navigation" className="ml-2 hidden items-center gap-0.5 lg:flex">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="ml-auto min-w-0 max-w-[65vw] text-right sm:max-w-[340px]">
          <p className="flex items-center justify-end gap-1.5 text-sm font-bold text-ink">Hi there <Sun size={18} className="text-amber" aria-hidden="true" /></p>
          <div className="mt-0.5 flex min-w-0 items-center justify-end gap-2">
            <button type="button" onClick={openLocation} aria-label={`Choose location: ${addressLine}`} aria-haspopup="dialog" className="location-link inline-flex min-w-0 items-center gap-1.5 text-right text-[11px] font-bold text-blue-deep" title={addressLine}>
              <LocateFixed size={18} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{addressLine}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
    <dialog ref={locationDialog} onClose={() => { locationRequest.current += 1; }} aria-labelledby="location-filter-title" className="fixed inset-0 m-auto max-h-[85dvh] w-[min(92vw,380px)] overflow-y-auto rounded-[20px] bg-white p-5 text-ink shadow-pop backdrop:bg-black/40">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="location-filter-title" className="font-display text-base font-extrabold">Update location</h2>
        <button type="button" onClick={() => locationDialog.current?.close()} className="text-sm font-bold text-blue-deep">Cancel</button>
      </div>
      <button type="button" onClick={handleCurrentLocation} disabled={locating} className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-blue-deep disabled:opacity-60">
        <LocateFixed size={18} aria-hidden="true" />
        {locating ? "Finding pincode..." : "Use current pincode"}
      </button>
      {detectedLocation && sameGeo(draftGeo, detectedLocation.geo) ? <p role="status" className="mb-3 text-sm text-ink">Current pincode: {detectedLocation.geo.pincode}<br />{detectedLocation.address}</p> : null}
      {locationError ? <p role="alert" className="mb-3 text-sm text-red-600">{locationError}</p> : null}
      <p className="mb-3 text-xs text-ink-soft">Or choose your area manually</p>
      <fieldset disabled={locating} className="disabled:opacity-60">
        <GeoFilterFields geo={draftGeo} defaultGeo={EMPTY_GEO} setGeo={setDraftGeo} />
      </fieldset>
      <button type="button" disabled={locating} onClick={() => { selectGeo(draftGeo); locationDialog.current?.close(); }} className="btn-primary mt-4 disabled:opacity-60">Apply location</button>
    </dialog>
    <main className="mx-auto w-full max-w-6xl flex-1 bg-bg-app pb-8">{children}</main>
    <SiteFooter />
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 bg-bg-page/95 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg gap-1 rounded-3xl border border-line bg-white p-2 shadow-card">
        <NavLinks pathname={pathname} mobile />
      </div>
    </nav>
  </div>;
}
