"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined;
  stopRowClick?: boolean;
  render: (row: T) => React.ReactNode;
};

const PAGE_SIZES = [10, 25, 50, 100] as const;
const NON_SORTABLE_KEYS = new Set(["actions", "image", "icon"]);

function isSortable<T>(col: Column<T>) {
  if (col.sortable === false) return false;
  if (col.sortable === true) return true;
  if (!col.header) return false;
  return !NON_SORTABLE_KEYS.has(col.key);
}

function toSortable(value: string | number | boolean | Date | null | undefined): string | number {
  if (value == null) return "";
  if (value instanceof Date) return value.getTime();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  return value;
}

function columnSortValue<T extends { id: string }>(row: T, col: Column<T>): string | number {
  if (col.sortValue) return toSortable(col.sortValue(row));
  const v = (row as Record<string, unknown>)[col.key];
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return toSortable(v);
  if (v instanceof Date) return v.getTime();
  return "";
}

function compare(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function Pager({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-ink-soft">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
          Records
          <select
            className="rounded-[10px] border border-line bg-white px-2 py-1.5 text-xs font-bold text-ink"
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-line bg-white disabled:opacity-40"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="min-w-[5.5rem] text-center text-xs font-bold text-ink">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-line bg-white disabled:opacity-40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = "No records found.",
  onRowClick,
  selectedId,
  defaultPageSize = 10,
  defaultSortKey,
  defaultSortDir = "desc",
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectedId?: string | null;
  defaultPageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: SortDir;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const rowSignature = `${rows.length}:${rows[0]?.id ?? ""}:${rows[rows.length - 1]?.id ?? ""}`;
  useEffect(() => {
    setPage(1);
  }, [rowSignature, pageSize, sortKey, sortDir]);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || !isSortable(col)) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp = compare(columnSortValue(a, col), columnSortValue(b, col));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (col: Column<T>) => {
    if (!isSortable(col)) return;
    if (sortKey !== col.key) {
      setSortKey(col.key);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const pager = (
    <Pager
      page={safePage}
      pageCount={pageCount}
      pageSize={pageSize}
      total={sorted.length}
      onPage={setPage}
      onPageSize={setPageSize}
    />
  );

  if (rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-[18px] border border-dashed border-line bg-white shadow-card">
        {pager}
        <div className="border-t border-line px-6 py-12 text-center text-sm text-ink-soft">{emptyMessage}</div>
        {pager}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-card">
      <div className="border-b border-line">{pager}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/80">
              {columns.map((col) => {
                const sortable = isSortable(col);
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={clsx(
                      "px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft",
                      col.className,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        {col.header}
                        {active ? (
                          sortDir === "asc" ? (
                            <ArrowUp size={12} className="text-blue-deep" />
                          ) : (
                            <ArrowDown size={12} className="text-blue-deep" />
                          )
                        ) : (
                          <ChevronsUpDown size={12} className="opacity-50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.id}
                className={clsx(
                  "border-b border-line last:border-0",
                  onRowClick ? "cursor-pointer hover:bg-surface/60" : "hover:bg-surface/40",
                  selectedId === row.id && "bg-blue-soft/60",
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((col) => {
                  const stop = col.stopRowClick || col.key === "actions";
                  return (
                    <td
                      key={col.key}
                      className={clsx("px-4 py-3 align-middle", col.className)}
                      onClick={stop ? (e) => e.stopPropagation() : undefined}
                    >
                      {col.render(row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line">{pager}</div>
    </div>
  );
}
