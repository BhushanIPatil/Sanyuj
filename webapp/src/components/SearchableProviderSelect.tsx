"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { displayPhone } from "@/lib/auth/phone";

export type ProviderCloseOption = {
  id: string;
  businessName: string;
  ownerName: string | null;
  ownerPhone: string | null;
  offeredAmount: number | null;
};

type Props = {
  options: ProviderCloseOption[];
  value: string;
  noneValue: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function SearchableProviderSelect({
  options,
  value,
  noneValue,
  onChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value === noneValue ? null : options.find((o) => o.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = [
        o.businessName,
        o.ownerName ?? "",
        o.ownerPhone ?? "",
        o.offeredAmount != null ? String(o.offeredAmount) : "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative mt-2.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-2 rounded-[12px] border border-line bg-white px-3 py-2.5 text-left disabled:opacity-60"
      >
        <div className="min-w-0 flex-1">
          {selected ? (
            <>
              <p className="truncate text-sm font-semibold text-ink">{selected.businessName}</p>
              <p className="mt-0.5 truncate text-[11px] text-ink-soft">
                {selected.ownerName?.trim() || "Provider"}
                {selected.ownerPhone ? ` · ${displayPhone(selected.ownerPhone)}` : ""}
                {selected.offeredAmount != null ? ` · ₹${selected.offeredAmount}` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-ink-soft">
              None — closed without a provider
            </p>
          )}
        </div>
        <span className="mt-0.5 shrink-0 text-ink-faint">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-[14px] border border-line bg-white shadow-pop">
          <div className="border-b border-line p-2">
            <input
              ref={inputRef}
              className="w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-blue-deep"
              placeholder="Search business, name, or phone…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              className={`flex w-full flex-col px-3 py-2.5 text-left hover:bg-surface ${
                value === noneValue ? "bg-blue-soft" : ""
              }`}
              onClick={() => pick(noneValue)}
            >
              <span className="text-sm font-semibold text-ink">None — closed without a provider</span>
            </button>
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`flex w-full flex-col border-t border-line px-3 py-2.5 text-left hover:bg-surface ${
                  value === o.id ? "bg-blue-soft" : ""
                }`}
                onClick={() => pick(o.id)}
              >
                <span className="text-sm font-semibold text-ink">{o.businessName}</span>
                <span className="mt-0.5 text-[11px] text-ink-soft">
                  {o.ownerName?.trim() || "Provider"}
                  {o.ownerPhone ? ` · ${displayPhone(o.ownerPhone)}` : ""}
                </span>
                {o.offeredAmount != null ? (
                  <span className="mt-0.5 font-mono text-[11px] font-bold text-ink">
                    Offered ₹{o.offeredAmount}
                  </span>
                ) : null}
              </button>
            ))}
            {!filtered.length ? (
              <p className="border-t border-line px-3 py-3 text-center text-xs text-ink-soft">
                No providers match your search.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
