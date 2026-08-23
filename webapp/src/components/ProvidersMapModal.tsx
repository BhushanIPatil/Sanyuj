"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Satellite, X } from "lucide-react";
import { displayPhone } from "@/lib/auth/phone";
import { categoryDisplayName } from "@/lib/categories";

export type MapProvider = {
  id: string;
  name: string;
  providerName: string | null;
  rating: number;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  categories: { id: string; name: string; slug: string; emoji: string | null } | null;
};

type MarkerPoint = MapProvider & { lat: number; lng: number };
type Basemap = "street" | "satellite";

async function geocodeAddress(q: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  if (!res.ok || !data.found) return null;
  return { lat: data.lat as number, lng: data.lng as number };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

function providerLabel(p: MapProvider) {
  const name = p.name?.trim() || "Provider";
  const cat = categoryDisplayName(p.categories) || "";
  return { name, cat, initials: initials(name) };
}

function makeProviderIcon(L: typeof import("leaflet"), p: MapProvider) {
  const { name, cat, initials: ini } = providerLabel(p);
  const shortName = name.length > 18 ? `${name.slice(0, 17)}…` : name;
  const html =
    `<div class="sanyuj-map-pin">` +
    `<span class="sanyuj-map-pin__avatar">${escapeHtml(ini)}</span>` +
    `<span class="sanyuj-map-pin__text">` +
    `<span class="sanyuj-map-pin__name">${escapeHtml(shortName)}</span>` +
    (cat ? `<span class="sanyuj-map-pin__cat">${escapeHtml(cat)}</span>` : "") +
    `</span></div>` +
    `<div class="sanyuj-map-pin__tail"></div>`;

  return L.divIcon({
    className: "sanyuj-map-marker",
    html,
    iconSize: [168, 52],
    iconAnchor: [84, 52],
    popupAnchor: [0, -48],
  });
}

function makeBaseLayer(L: typeof import("leaflet"), basemap: Basemap) {
  if (basemap === "satellite") {
    // Esri World Imagery (satellite / aerial)
    return L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        maxZoom: 19,
      },
    );
  }

  return L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  });
}

export function ProvidersMapModal({
  open,
  onClose,
  providers,
}: {
  open: boolean;
  onClose: () => void;
  providers: MapProvider[];
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const baseLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const [points, setPoints] = useState<MarkerPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [basemap, setBasemap] = useState<Basemap>("satellite");

  const providersKey = useMemo(
    () =>
      providers
        .map((p) => `${p.id}|${p.lat ?? ""}|${p.lng ?? ""}|${p.address ?? ""}`)
        .join(";"),
    [providers],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setStatus("Locating providers…");
      const resolved: MarkerPoint[] = [];

      for (const p of providers) {
        if (cancelled) return;
        if (p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
          resolved.push({ ...p, lat: p.lat, lng: p.lng });
          continue;
        }
        if (!p.address?.trim()) continue;
        const hit = await geocodeAddress(p.address.trim());
        await sleep(1100);
        if (hit) resolved.push({ ...p, lat: hit.lat, lng: hit.lng });
      }

      if (cancelled) return;
      setPoints(resolved);
      setStatus(
        resolved.length
          ? `${resolved.length} provider${resolved.length === 1 ? "" : "s"} on the map`
          : "No provider locations found",
      );
      setLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, providersKey]);

  // Create map + markers when points are ready
  useEffect(() => {
    if (!open || !mapEl.current || loading) return;
    let cancelled = false;

    const setup = async () => {
      const L = (await import("leaflet")).default;

      if (cancelled || !mapEl.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        baseLayerRef.current = null;
      }

      const map = L.map(mapEl.current, {
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;

      const base = makeBaseLayer(L, basemap);
      baseLayerRef.current = base;
      base.addTo(map);

      const bounds: import("leaflet").LatLngExpression[] = [];

      for (const p of points) {
        const { name, cat } = providerLabel(p);
        const marker = L.marker([p.lat, p.lng], {
          icon: makeProviderIcon(L, p),
          title: cat ? `${name} · ${cat}` : name,
          riseOnHover: true,
        }).addTo(map);
        const contact = p.phone?.trim() ? displayPhone(p.phone) : null;
        const telHref = p.phone?.replace(/\D/g, "") || "";
        const providerName = p.providerName?.trim() || null;
        marker.bindPopup(
          `<div style="min-width:160px;font-family:inherit">` +
            `<div style="font-size:14px;font-weight:700;color:#152033">${escapeHtml(name)}</div>` +
            (providerName
              ? `<div style="margin-top:2px;font-size:12px;font-weight:600;color:#152033">${escapeHtml(providerName)}</div>`
              : "") +
            `<div style="margin-top:2px;font-size:12px;color:#66727f">${escapeHtml(cat || "Provider")} · ${p.rating.toFixed(1)} ★</div>` +
            (contact
              ? `<div style="margin-top:8px;font-size:12px;font-weight:700">` +
                `<a href="tel:${escapeHtml(telHref)}" style="color:#1d5fa0;text-decoration:none">${escapeHtml(contact)}</a>` +
                `</div>`
              : `<div style="margin-top:8px;font-size:12px;color:#a6b0ba">No contact available</div>`) +
            (p.address
              ? `<div style="margin-top:6px;font-size:11px;line-height:1.35;color:#66727f">${escapeHtml(p.address)}</div>`
              : "") +
            `</div>`,
        );
        bounds.push([p.lat, p.lng]);
      }

      if (bounds.length === 1) {
        map.setView(bounds[0] as [number, number], 17);
      } else if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [48, 48], maxZoom: 17 });
      } else {
        map.setView([20.5937, 78.9629], 5);
      }

      requestAnimationFrame(() => {
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 150);
      });
    };

    void setup();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        baseLayerRef.current = null;
      }
    };
    // basemap handled in a separate effect so toggling doesn't re-geocode / rebuild markers from scratch unnecessarily
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, points]);

  // Swap basemap without destroying markers
  useEffect(() => {
    const map = mapRef.current;
    if (!open || !map || loading) return;

    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      if (baseLayerRef.current) {
        map.removeLayer(baseLayerRef.current);
      }
      const next = makeBaseLayer(L, basemap);
      baseLayerRef.current = next;
      next.addTo(map);
      // Keep base under markers
      next.bringToBack();
    })();

    return () => {
      cancelled = true;
    };
  }, [basemap, open, loading]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/40 backdrop-blur-[2px]">
      <div className="flex min-h-0 flex-1 flex-col bg-bg-page lg:pl-64">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 shadow-card">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
              <MapPin size={12} /> Map view
            </p>
            <h2 className="truncate font-display text-base font-bold">Providers near you</h2>
            <p className="truncate text-xs text-ink-soft">{status}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex rounded-full border border-line bg-surface p-0.5">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  basemap === "street" ? "bg-white text-blue-deep shadow-card" : "text-ink-soft"
                }`}
                onClick={() => setBasemap("street")}
              >
                Map
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  basemap === "satellite" ? "bg-white text-blue-deep shadow-card" : "text-ink-soft"
                }`}
                onClick={() => setBasemap("satellite")}
              >
                <Satellite size={12} />
                Satellite
              </button>
            </div>
            <button
              type="button"
              aria-label="Close map"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-line bg-white"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <div ref={mapEl} className="absolute inset-0 z-0 bg-surface" />
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm font-bold text-ink-soft">
              Locating providers on the map…
            </div>
          ) : null}
          {!loading && !points.length ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 px-6 text-center text-sm text-ink-soft">
              No addresses available to show. Providers need a saved address on their profile.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
