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
        if (value && !list.some((a) => a.id === value || a.name === value)) {
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

  if (pincode.length !== 6 || !locality.trim()) {
    return (
      <p className="mt-1.5 text-[12px] text-ink-soft">Select a locality to see areas.</p>
    );
  }
  if (loading) {
    return <p className="mt-1.5 text-[12px] font-semibold text-ink-soft">Loading areas…</p>;
  }
  if (!areas.length) {
    return (
      <p className="mt-1.5 text-[11px] text-ink-soft">
        Areas for this locality will appear once they are added.
      </p>
    );
  }

  const selected = areas.some((a) => a.id === value)
    ? value
    : (areas.find((a) => a.name === value)?.id ?? "");

  return (
    <div className="mt-1">
      <select
        className="input-box py-3 text-sm"
        value={selected}
        disabled={disabled}
        onChange={(e) => {
          const next = areas.find((a) => a.id === e.target.value);
          onChange(next?.id ?? "", next?.name ?? "");
        }}
      >
        <option value="">Select area / colony</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}
