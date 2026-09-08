"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type JobFormValues = {
  customer_id: string;
  category_id: string;
  title: string;
  description: string;
  pincode: string;
  locality: string;
  area: string;
  urgency: "today" | "this_week" | "flexible";
  budget_min: string;
  budget_max: string;
};

export type CustomerOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  pincode: string | null;
  locality: string | null;
  area: string | null;
};

export type CategoryOption = { id: string; name: string };

export const EMPTY_JOB_FORM: JobFormValues = {
  customer_id: "",
  category_id: "",
  title: "",
  description: "",
  pincode: "",
  locality: "",
  area: "",
  urgency: "flexible",
  budget_min: "",
  budget_max: "",
};

function customerLabel(c: CustomerOption) {
  return c.full_name?.trim() || c.email || c.phone || c.id;
}

function customerMeta(c: CustomerOption) {
  return [c.email, c.phone].filter((v) => v?.trim()).join(" · ");
}

function SearchableCustomerSelect({
  customers,
  value,
  onChange,
}: {
  customers: CustomerOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = customers.find((c) => c.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? customers
      : customers.filter((c) =>
          `${c.full_name ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${c.pincode ?? ""} ${c.locality ?? ""}`
            .toLowerCase()
            .includes(q),
        );
    return list.slice(0, 80);
  }, [customers, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="input-box flex w-full items-start justify-between gap-2 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          {selected ? (
            <>
              <p className="truncate text-sm font-semibold text-ink">{customerLabel(selected)}</p>
              {customerMeta(selected) ? (
                <p className="mt-0.5 truncate text-[11px] text-ink-soft">{customerMeta(selected)}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm font-semibold text-ink-soft">Search name, email, or phone</p>
          )}
        </div>
        <span className="mt-0.5 shrink-0 text-ink-faint">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="mt-1.5 overflow-hidden rounded-[16px] border border-line bg-white shadow-pop">
          <div className="border-b border-line p-2">
            <input
              ref={inputRef}
              className="input-box py-2.5 text-sm"
              placeholder="Search name, email, or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-56 divide-y divide-line overflow-y-auto" role="listbox">
            {filtered.map((c) => {
              const meta = customerMeta(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={c.id === value}
                  className={`flex w-full flex-col px-3 py-2.5 text-left hover:bg-surface ${
                    c.id === value ? "bg-blue-soft" : ""
                  }`}
                  onClick={() => pick(c.id)}
                >
                  <span className="truncate text-sm font-semibold text-ink">{customerLabel(c)}</span>
                  {meta ? <span className="mt-0.5 truncate text-[11px] text-ink-soft">{meta}</span> : null}
                </button>
              );
            })}
            {!filtered.length ? (
              <p className="px-3 py-3 text-center text-xs text-ink-soft">
                {customers.length === 0 ? "No customers found." : "No customers match your search."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function JobFormModal({
  mode,
  initial,
  customers,
  categories,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: JobFormValues;
  customers: CustomerOption[];
  categories: CategoryOption[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: JobFormValues) => void;
}) {
  const [form, setForm] = useState(initial);
  const [customerError, setCustomerError] = useState("");

  const set = (key: keyof JobFormValues, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onCustomerChange = (id: string) => {
    const customer = customers.find((c) => c.id === id);
    setCustomerError("");
    setForm((f) => ({
      ...f,
      customer_id: id,
      pincode: f.pincode || customer?.pincode || "",
      locality: f.locality || customer?.locality || "",
      area: f.area || customer?.area || "",
    }));
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/40 p-4">
      <form
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-pop"
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === "create" && !form.customer_id) {
            setCustomerError("Select a customer");
            return;
          }
          onSubmit(form);
        }}
      >
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-bold">{mode === "create" ? "Create job" : "Edit job"}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {mode === "create" ? "Post a job for a customer and notify nearby providers." : "Update job details."}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {mode === "create" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Customer</span>
              <SearchableCustomerSelect
                customers={customers}
                value={form.customer_id}
                onChange={onCustomerChange}
              />
              {customerError ? <p className="mt-1.5 text-xs font-semibold text-rose">{customerError}</p> : null}
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Category</span>
            <select
              required
              className="input-box py-3 text-sm"
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Title</span>
            <input
              required
              className="input-box py-3 text-sm"
              maxLength={80}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Description</span>
            <textarea
              required
              className="input-box min-h-[96px] py-3 text-sm"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Pincode</span>
              <input
                required
                className="input-box py-3 text-sm"
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Locality</span>
              <input
                required
                className="input-box py-3 text-sm"
                value={form.locality}
                onChange={(e) => set("locality", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Area</span>
              <input className="input-box py-3 text-sm" value={form.area} onChange={(e) => set("area", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Urgency</span>
              <select
                className="input-box py-3 text-sm"
                value={form.urgency}
                onChange={(e) => set("urgency", e.target.value as JobFormValues["urgency"])}
              >
                <option value="today">Today</option>
                <option value="this_week">This week</option>
                <option value="flexible">Flexible</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Budget min</span>
              <input
                type="number"
                min={0}
                className="input-box py-3 text-sm"
                value={form.budget_min}
                onChange={(e) => set("budget_min", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Budget max</span>
              <input
                type="number"
                min={0}
                className="input-box py-3 text-sm"
                value={form.budget_max}
                onChange={(e) => set("budget_max", e.target.value)}
              />
            </label>
          </div>
          {error ? <p className="text-sm font-semibold text-rose">{error}</p> : null}
        </div>
        <div className="flex gap-3 border-t border-line px-6 py-4">
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 !w-auto py-3" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create" : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
