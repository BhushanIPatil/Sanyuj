"use client";

import { useMemo, useState } from "react";
import { formatBudget } from "@/lib/format";

export type DealInterest = {
  id: string;
  business_id: string;
  status: string;
  offered_amount: number | null;
  businesses: {
    name: string;
    category_id?: string | null;
    categories: { id: string; name: string } | null;
    profiles: { full_name: string | null } | null;
  } | null;
};

export type DealProvider = {
  id: string;
  name: string;
  profiles: { full_name: string | null; phone: string | null } | null;
  categories: { id: string; name: string } | null;
};

function interestCategoryId(row: DealInterest) {
  return row.businesses?.categories?.id ?? row.businesses?.category_id ?? null;
}

function pickInitialBusinessId(
  assignedBusinessId: string | null,
  categoryInterests: DealInterest[],
  categoryProviders: DealProvider[],
) {
  if (assignedBusinessId && categoryProviders.some((p) => p.id === assignedBusinessId)) {
    return assignedBusinessId;
  }
  return categoryInterests[0]?.business_id ?? "";
}

export function JobDealModal({
  title,
  status,
  categoryId,
  categoryName,
  assignedBusinessId,
  interests,
  providers,
  saving,
  error,
  onClose,
  onAssign,
  onCloseUnassigned,
  onReopen,
}: {
  title: string;
  status: string;
  categoryId: string | null;
  categoryName: string | null;
  assignedBusinessId: string | null;
  interests: DealInterest[];
  providers: DealProvider[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onAssign: (businessId: string, finalAmount: string) => void;
  onCloseUnassigned: () => void;
  onReopen: () => void;
}) {
  const categoryInterests = useMemo(() => {
    if (!categoryId) return interests;
    return interests.filter((row) => interestCategoryId(row) === categoryId);
  }, [interests, categoryId]);

  const categoryProviders = useMemo(() => {
    let list = !categoryId
      ? providers
      : providers.filter((p) => p.categories?.id === categoryId);
    if (assignedBusinessId && !list.some((p) => p.id === assignedBusinessId)) {
      const assigned = providers.find((p) => p.id === assignedBusinessId);
      if (assigned) list = [assigned, ...list];
    }
    return list;
  }, [providers, categoryId, assignedBusinessId]);

  const [businessId, setBusinessId] = useState(() =>
    pickInitialBusinessId(assignedBusinessId, categoryInterests, categoryProviders),
  );
  const [providerQuery, setProviderQuery] = useState("");
  const [finalAmount, setFinalAmount] = useState("");

  const matchedProviders = useMemo(() => {
    const q = providerQuery.trim().toLowerCase();
    const list = !q
      ? categoryProviders
      : categoryProviders.filter((p) =>
          `${p.name} ${p.profiles?.full_name ?? ""} ${p.profiles?.phone ?? ""} ${p.categories?.name ?? ""}`
            .toLowerCase()
            .includes(q),
        );
    return list.slice(0, 80);
  }, [categoryProviders, providerQuery]);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-pop">
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-bold">Assign provider</h2>
          <p className="mt-1 text-sm text-ink-soft">Close the deal for “{title}” with a provider.</p>
          {categoryName ? (
            <p className="mt-1 text-xs font-semibold text-ink-soft">
              Showing {categoryName} providers only.
            </p>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {categoryInterests.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-bold text-ink-soft">Interested providers</p>
              <ul className="divide-y divide-line rounded-[16px] border border-line">
                {categoryInterests.map((row) => (
                  <li key={row.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-3">
                      <input
                        type="radio"
                        name="deal-provider"
                        className="mt-1"
                        checked={businessId === row.business_id}
                        onChange={() => setBusinessId(row.business_id)}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold">{row.businesses?.name ?? "Provider"}</p>
                        <p className="text-xs text-ink-soft">
                          {row.businesses?.profiles?.full_name || "Owner"} · {row.status}
                          {row.offered_amount != null ? ` · offered ${formatBudget(row.offered_amount, row.offered_amount)}` : ""}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              {categoryName
                ? `No interested ${categoryName} providers yet. Assign a matching provider below.`
                : "No interests yet. Assign any provider below."}
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">
              Search providers{categoryName ? ` in ${categoryName}` : ""}
            </span>
            <input
              className="input-box py-3 text-sm"
              value={providerQuery}
              onChange={(e) => setProviderQuery(e.target.value)}
              placeholder="Business, owner, or phone"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Provider</span>
            <select
              className="input-box py-3 text-sm"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
            >
              <option value="">Select provider</option>
              {matchedProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.categories?.name ? ` · ${p.categories.name}` : ""}
                </option>
              ))}
            </select>
            {!matchedProviders.length ? (
              <p className="mt-1.5 text-xs text-ink-soft">
                {categoryName
                  ? `No ${categoryName} providers found.`
                  : "No providers found."}
              </p>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Final amount (optional)</span>
            <input
              type="number"
              min={0}
              className="input-box py-3 text-sm"
              value={finalAmount}
              onChange={(e) => setFinalAmount(e.target.value)}
              placeholder="Locks budget to this amount"
            />
          </label>
          {error ? <p className="text-sm font-semibold text-rose">{error}</p> : null}
        </div>
        <div className="space-y-2 border-t border-line px-6 py-4">
          <button
            type="button"
            className="btn-primary"
            disabled={saving || !businessId}
            onClick={() => onAssign(businessId, finalAmount)}
          >
            {saving ? "Saving…" : "Close deal with provider"}
          </button>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            {status === "closed" ? (
              <button type="button" className="btn-secondary flex-1" disabled={saving} onClick={onReopen}>
                Reopen job
              </button>
            ) : (
              <button type="button" className="btn-secondary flex-1" disabled={saving} onClick={onCloseUnassigned}>
                Close without provider
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
