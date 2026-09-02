"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAreasForLocality, type AreaOption } from "@/lib/geo/areas";
import { resolveLocalityId } from "@/lib/geo/localities";

type Props = {
  pincode: string;
  locality: string;
  value: string;
  onChange: (areaId: string, areaName: string) => void;
  onAvailabilityChange?: (hasAreas: boolean) => void;
  disabled?: boolean;
};

export function AreaPicker({
  pincode,
  locality,
  value,
  onChange,
  onAvailabilityChange,
  disabled,
}: Props) {
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pincode.length !== 6 || !locality.trim()) {
      setAreas([]);
      onAvailabilityChange?.(false);
      if (value) onChange("", "");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const localityId = await resolveLocalityId(supabase, pincode, locality);
        const list = localityId ? await fetchAreasForLocality(supabase, localityId) : [];
        if (cancelled) return;
        setAreas(list);
        onAvailabilityChange?.(list.length > 0);
        if (value && !list.some((a) => a.id === value)) {
          onChange("", "");
        }
      } catch {
        if (cancelled) return;
        setAreas([]);
        onAvailabilityChange?.(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [pincode, locality]); // eslint-disable-line react-hooks/exhaustive-deps

  if (pincode.length !== 6 || !locality.trim()) return null;
  if (loading) {
    return <p className="mt-2 text-[12px] font-semibold text-ink-soft">Loading areas…</p>;
  }
  if (!areas.length) return null;

  return (
    <div className="mt-2">
      <select
        className="input-box"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const next = areas.find((a) => a.id === e.target.value);
          onChange(next?.id ?? "", next?.name ?? "");
        }}
      >
        <option value="">Select your area / colony</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}
