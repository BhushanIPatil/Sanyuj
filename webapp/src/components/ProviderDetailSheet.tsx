"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { displayPhone } from "@/lib/auth/phone";
import { fetchBusinessCoverage, type CoverageRow } from "@/lib/geo/coverage";
import { BusinessAvatar } from "@/components/BusinessPhotoPicker";

export type ProviderDetail = {
  id: string;
  name: string;
  photo_url: string | null;
  category: string;
  providerName: string | null;
  phone: string | null;
  address: string | null;
};

type ServiceAreaGroup = {
  pincode: string;
  summary: string;
};

/** Turns raw `business_service_areas` rows into one readable line per pincode. */
export function groupServiceAreas(rows: CoverageRow[]): ServiceAreaGroup[] {
  const byPincode = new Map<string, CoverageRow[]>();
  for (const row of rows) {
    const pin = row.pincode?.trim();
    if (!pin) continue;
    const list = byPincode.get(pin);
    if (list) list.push(row);
    else byPincode.set(pin, [row]);
  }

  return [...byPincode.keys()]
    .sort()
    .map((pincode) => {
      const group = byPincode.get(pincode)!;
      if (group.some((r) => !r.locality_id && !r.area_id)) {
        return { pincode, summary: "Entire pincode" };
      }

      const byLocality = new Map<string, Set<string>>();
      for (const row of group) {
        const locName = row.localities?.name?.trim();
        if (!locName) continue;
        const areas = byLocality.get(locName) ?? new Set<string>();
        const areaName = row.areas?.name?.trim();
        if (areaName) areas.add(areaName);
        byLocality.set(locName, areas);
      }

      const parts = [...byLocality.entries()]
        .map(([locality, areas]) =>
          areas.size ? `${locality}: ${[...areas].sort().join(", ")}` : `${locality} (all areas)`,
        )
        .sort();

      return { pincode, summary: parts.length ? parts.join(" · ") : "Entire pincode" };
    });
}

export function ProviderDetailSheet({
  provider,
  open,
  onClose,
}: {
  provider: ProviderDetail | null;
  open: boolean;
  onClose: () => void;
}) {
  // Keyed by business id so a newly opened provider never shows the previous one's areas.
  const [loaded, setLoaded] = useState<{ id: string; groups: ServiceAreaGroup[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const businessId = open ? provider?.id : undefined;

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchBusinessCoverage(createClient(), businessId);
        if (!cancelled) setLoaded({ id: businessId, groups: groupServiceAreas(rows) });
      } catch {
        if (!cancelled) setLoaded({ id: businessId, groups: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  if (!open || !provider) return null;

  const loading = loaded?.id !== provider.id;
  const coverage = loading ? [] : loaded!.groups;

  const phoneDigits = provider.phone?.replace(/\D/g, "") ?? "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="provider-detail-title"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-white shadow-pop sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft"
        >
          <X size={16} />
        </button>

        <div className="overflow-y-auto px-5 pb-6 pt-4">
          <div className="flex items-start gap-3.5 pr-10">
            <BusinessAvatar name={provider.name} photoUrl={provider.photo_url} size={60} />
            <div className="min-w-0">
              <h2
                id="provider-detail-title"
                className="font-display text-xl font-extrabold leading-snug text-ink"
              >
                {provider.name}
              </h2>
              {provider.category ? (
                <span className="mt-1.5 inline-block rounded-full bg-blue-soft px-2.5 py-1 text-[11px] font-bold text-blue-deep">
                  {provider.category}
                </span>
              ) : null}
            </div>
          </div>

          <dl className="mt-5 space-y-2.5">
            <DetailRow
              icon={<User size={16} />}
              label="Provider"
              value={provider.providerName?.trim() || "Not shared"}
            />
            <DetailRow
              icon={<Phone size={16} />}
              label="Contact"
              value={provider.phone ? displayPhone(provider.phone) : "No contact shared"}
              mono={Boolean(provider.phone)}
            />
            {provider.address ? (
              <DetailRow
                icon={<MapPin size={16} />}
                label="Based in"
                value={provider.address}
              />
            ) : null}
          </dl>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
            Where they serve
          </p>

          {loading ? (
            <div className="mt-2.5 space-y-2.5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-[18px] bg-surface" />
              ))}
            </div>
          ) : coverage.length ? (
            <div className="mt-2.5 space-y-2.5">
              {coverage.map((group) => (
                <div key={group.pincode} className="rounded-[18px] border border-line bg-surface p-3.5">
                  <p className="font-mono text-[13px] font-bold text-ink">{group.pincode}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{group.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2.5 rounded-[18px] border border-line bg-surface p-4">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                This provider has not listed their service areas yet.
              </p>
            </div>
          )}

          {phoneDigits ? (
            <a href={`tel:${phoneDigits}`} className="btn-primary mt-6 block w-full text-center">
              Call provider
            </a>
          ) : (
            <p className="mt-6 rounded-[14px] bg-surface px-4 py-3 text-center text-[13px] font-semibold text-ink-soft">
              No contact shared by this provider.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-surface text-blue-deep">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[9.5px] font-bold uppercase tracking-wide text-ink-faint">{label}</dt>
        <dd
          className={`mt-0.5 text-[13px] leading-snug ${
            mono ? "font-mono font-bold text-blue-deep" : "font-semibold text-ink"
          }`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
