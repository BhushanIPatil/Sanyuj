"use client";

import { useEffect, useState } from "react";
import type { PostalLocality } from "@/lib/geo/postal";

type Props = {
  pincode: string;
  value: string;
  onChange: (locality: string) => void;
  disabled?: boolean;
};

export function LocalityPicker({ pincode, value, onChange, disabled }: Props) {
  const [localities, setLocalities] = useState<PostalLocality[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (pincode.length !== 6) {
      setLocalities([]);
      setError("");
      setFromCache(false);
      if (value) onChange("");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      setFromCache(false);
      try {
        const res = await fetch(`/api/geo/pincode/${pincode}`);
        const data = (await res.json()) as {
          localities?: PostalLocality[];
          source?: string;
          error?: string;
        };
        if (cancelled) return;
        const list = data.localities ?? [];
        if (!res.ok && !list.length) {
          throw new Error(data.error ?? "Could not load localities");
        }
        setLocalities(list);
        setFromCache(data.source === "cache");
        if (!list.length && !value) {
          setError(data.error ?? "No localities found for this pincode");
        }
      } catch (err) {
        if (cancelled) return;
        setLocalities([]);
        setError(err instanceof Error ? err.message : "Could not load localities");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [pincode]); // eslint-disable-line react-hooks/exhaustive-deps -- reset selection only when pincode changes

  if (pincode.length !== 6) {
    return (
      <p className="mt-2 text-[12px] text-ink-soft">Enter your 6-digit pincode to see localities.</p>
    );
  }

  const options = [...localities];
  if (value && !options.some((l) => l.name === value)) {
    options.unshift({ name: value, district: null, state: null });
  }

  return (
    <div className="mt-2">
      {loading ? (
        <p className="text-[12px] font-semibold text-ink-soft">Loading localities…</p>
      ) : (
        <>
          {error && !options.length ? (
            <p className="text-[12px] font-semibold text-rose">{error}</p>
          ) : (
            <select
              className="input-box"
              value={value}
              disabled={disabled || !options.length}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">Select your locality</option>
              {options.map((l) => (
                <option key={l.id ?? l.name} value={l.name}>
                  {l.name}
                  {l.district ? ` · ${l.district}` : ""}
                </option>
              ))}
            </select>
          )}
          {fromCache ? (
            <p className="mt-1.5 text-[11px] text-ink-soft">
              Showing saved localities while the postal lookup is unavailable.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
