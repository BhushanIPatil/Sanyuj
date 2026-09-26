"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RequestOption = { id: string; name: string; contact: string };

export function RequestPicker({ kind, value, disabled, onChange }: {
  kind: "offer" | "notice"; value: string; disabled: boolean; onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<RequestOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      void (async () => {
        try {
          const client = createClient();
          let query = client.from("content_requests").select("id,name,contact").eq("kind", kind);
          const term = search.trim();
          // UUIDs are searched exactly; names are searched without raw filter interpolation.
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)) query = query.eq("id", term);
          else if (term) query = query.ilike("name", `%${term}%`);
          const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
          if (error) throw error;
          const choices = data ?? [];
          if (value && !choices.some(row => row.id === value)) {
            const { data: selected, error } = await client.from("content_requests").select("id,name,contact").eq("kind", kind).eq("id", value).maybeSingle();
            if (error) throw error;
            if (selected) choices.unshift(selected);
          }
          if (!cancelled) { setOptions(choices); setError(""); }
        } catch {
          if (!cancelled) setError("Could not load requests. Change the search to retry.");
        } finally { if (!cancelled) setLoading(false); }
      })();
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [kind, search, value]);
  return <div>
    <label className="block text-xs font-bold text-ink-soft">Search requests
      <input disabled={disabled} className="input-box mt-1 py-3 text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or full request ID" />
    </label>
    <label className="mt-3 block text-xs font-bold text-ink-soft">Request (optional)
      <select disabled={disabled} className="input-box mt-1 py-3 text-sm" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Not linked</option>
        {value && !options.some(row => row.id === value) ? <option value={value}>{value}</option> : null}
        {options.map(row => <option key={row.id} value={row.id}>{row.id} — {row.name} ({row.contact})</option>)}
      </select>
    </label>
    <p className="mt-1 text-xs text-ink-soft">{loading ? "Loading requests…" : "Up to 50 matching requests. Leave Not linked if no request applies."}</p>
    {error ? <p role="alert" className="mt-1 text-sm text-rose">{error}</p> : null}
  </div>;
}
