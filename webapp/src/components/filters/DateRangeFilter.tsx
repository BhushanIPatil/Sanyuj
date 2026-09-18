"use client";

import { useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import { dateRangeLabel, dateRangePresets } from "./dates";

export function DateRangeFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const presets = dateRangePresets();
  const [custom, setCustom] = useState(() => !!value && !presets.some(preset => preset.value === value));
  const [from = "", to = ""] = value.split("|");
  const update = (next: string) => { if (next !== value) onChange(next); };
  return <div>
    <p className="mb-3 text-xs leading-5 text-ink-soft">Choose when you want to see active items.</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Quick date choices">
      {presets.map(preset => {
        const selected = !custom && value === preset.value;
        return <button key={preset.label} type="button" aria-pressed={selected}
          onClick={() => { setCustom(false); update(preset.value); }}
          className={"inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition " + (selected ? "border-blue-deep bg-blue-soft text-blue-deep" : "border-line bg-white text-ink hover:bg-surface")}>
          {selected ? <Check size={14} aria-hidden="true" /> : null}{preset.label}
        </button>;
      })}
      <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={"inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold " + (custom ? "border-blue-deep bg-blue-soft text-blue-deep" : "border-line bg-white text-ink hover:bg-surface")}><CalendarDays size={14} aria-hidden="true" />Custom dates</button>
    </div>
    {custom ? <div className="mt-4 space-y-3 rounded-2xl border border-line bg-surface p-3">
      <p className="text-xs text-ink-soft">Pick a start and end date. Both days are included.</p>
      <label className="block text-xs font-bold">Start date<input type="date" value={from} onChange={e => { const next = e.target.value; update(next ? next + "|" + (to && to >= next ? to : next) : ""); }} className="input-box mt-1 w-full min-w-0" /></label>
      <label className="block text-xs font-bold">End date<input type="date" value={to} min={from || undefined} onChange={e => { const next = e.target.value; update(next ? (from && from <= next ? from : next) + "|" + next : ""); }} className="input-box mt-1 w-full min-w-0" /></label>
    </div> : null}
    <p className="mt-3 text-xs font-semibold leading-5 text-blue-deep" aria-live="polite">{dateRangeLabel(value)}</p>
  </div>;
}
