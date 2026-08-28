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

  useEffect(() => {
    if (pincode.length !== 6) {
      setLocalities([]);
      setError("");
      if (value) onChange("");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/geo/pincode/${pincode}`);
        const data = (await res.json()) as {
          localities?: PostalLocality[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Could not load localities");
        if (cancelled) return;
        setLocalities(data.localities ?? []);
        if (value && !(data.localities ?? []).some((l) => l.name === value)) {
          onChange("");
        }
      } catch (err) {
        if (cancelled) return;
        setLocalities([]);
        setError(err instanceof Error ? err.message : "Could not load localities");
        if (value) onChange("");
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

  return (
    <div className="mt-2">
      {loading ? (
        <p className="text-[12px] font-semibold text-ink-soft">Loading localities…</p>
      ) : error ? (
        <p className="text-[12px] font-semibold text-rose">{error}</p>
      ) : (
        <select
          className="input-box"
          value={value}
          disabled={disabled || !localities.length}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select your locality</option>
          {localities.map((l) => (
            <option key={l.name} value={l.name}>
              {l.name}
              {l.district ? ` · ${l.district}` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
