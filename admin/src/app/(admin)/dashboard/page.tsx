"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, CalendarDays, ClipboardList, FolderTree, MapPinned, Megaphone, Newspaper, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { dateRange, localDate, type Period } from "./dateRange";

const metrics = [
  { table: "ads", label: "Offers", href: "/ads", icon: Megaphone, tone: "bg-blue-soft text-blue-deep", detail: "Offers created", softDelete: true },
  { table: "notices", label: "Notices", href: "/notices", icon: Newspaper, tone: "bg-teal-soft text-teal", detail: "Notices created", softDelete: true },
  { table: "content_requests", label: "Requests", href: "/requests", icon: ClipboardList, tone: "bg-amber-soft text-amber", detail: "Requests received", softDelete: false },
  { table: "content_categories", label: "Categories", href: "/categories", icon: FolderTree, tone: "bg-indigo-soft text-indigo", detail: "Categories added", softDelete: true },
  { table: "areas", label: "Areas", href: "/areas", icon: MapPinned, tone: "bg-green-soft text-green-deep", detail: "Areas added", softDelete: true },
  { table: "push_notifications", label: "Push campaigns", href: "/notifications", icon: Bell, tone: "bg-rose-soft text-rose", detail: "Campaigns created", softDelete: false },
] as const;
const periods: { value: Period; label: string }[] = [
  { value: "today", label: "Today" }, { value: "week", label: "Current week" },
  { value: "month", label: "Current month" }, { value: "year", label: "Current year" },
  { value: "custom", label: "Custom" },
];
const statuses = [
  { value: "new", label: "New", color: "bg-blue", description: "Awaiting first response" },
  { value: "contacted", label: "Contacted", color: "bg-amber", description: "Follow-up in progress" },
  { value: "published", label: "Published", color: "bg-green", description: "Content published" },
  { value: "closed", label: "Closed", color: "bg-slate-400", description: "Request completed" },
];
type Snapshot = { key: string; counts: number[]; statuses: number[]; updated: Date };
const number = (value: number) => value.toLocaleString();

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("today");
  const [from, setFrom] = useState(() => localDate(new Date()));
  const [to, setTo] = useState(() => localDate(new Date()));
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const range = dateRange(period, from, to);
  const start = range?.start;
  const end = range?.end;
  const key = `${start}/${end}/${revision}`;
  const error = failure === key;
  const data = snapshot?.key === key ? snapshot : null;
  const loading = !!range && !data && !error;

  useEffect(() => {
    if (!start || !end) return;
    let cancelled = false;
    async function load() {
      try {
        const db = createClient();
        const results = await Promise.all([
          ...metrics.map(metric => {
            let query = db.from(metric.table).select("id", { count: "exact", head: true }).gte("created_at", start!).lt("created_at", end!);
            if (metric.softDelete) query = query.eq("is_deleted", false);
            return query;
          }),
          ...statuses.map(status => db.from("content_requests").select("id", { count: "exact", head: true })
            .gte("created_at", start!).lt("created_at", end!).eq("status", status.value)),
        ]);
        if (results.some(result => result.error || result.count === null)) throw new Error("Dashboard unavailable");
        if (!cancelled) {
          setFailure(null);
          setSnapshot({ key, counts: results.slice(0, metrics.length).map(r => r.count!), statuses: results.slice(metrics.length).map(r => r.count!), updated: new Date() });
        }
      } catch {
        if (!cancelled) setFailure(key);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [start, end, key]);

  const dateLabel = range ? (() => {
    const last = new Date(range.end);
    last.setDate(last.getDate() - 1);
    const format = (date: Date) => date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    return `${format(new Date(range.start))}${localDate(new Date(range.start)) === localDate(last) ? "" : ` – ${format(last)}`}`;
  })() : "Choose a valid date range";
  const requests = data?.counts[2] ?? 0;
  const pending = data ? data.statuses[0] + data.statuses[1] : 0;

  return (
    <div className="page-pad min-h-full bg-surface/60">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-teal">Workspace overview</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">Dashboard</h1>
            <p className="mt-1 text-sm text-ink-soft">A clear view of your content, requests, and community.</p>
          </div>
          <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading || !range} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold shadow-sm transition hover:bg-surface disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </header>
        <section aria-label="Dashboard date filter" className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-surface p-2.5 text-ink-soft"><CalendarDays size={20} /></span>
              <div><p className="text-xs font-semibold text-ink-soft">Reporting period</p><p className="mt-0.5 text-sm font-bold">{dateLabel}</p></div>
            </div>
            <div className="flex flex-wrap gap-1 rounded-xl bg-surface p-1" role="group" aria-label="Reporting period">
              {periods.map(item => <button key={item.value} type="button" aria-pressed={period === item.value} onClick={() => setPeriod(item.value)} className={`rounded-lg px-3 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-blue ${period === item.value ? "bg-white text-blue-deep shadow-sm" : "text-ink-soft hover:bg-white/70 hover:text-ink"}`}>{item.label}</button>)}
            </div>
          </div>
          {period === "custom" && <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-4">
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-ink-soft">From<input type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-blue" /></label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold text-ink-soft">To<input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-blue" /></label>
          </div>}
          <p className="mt-3 text-xs text-ink-soft">Statistics use creation dates in your local time. Weeks start on Monday. Deleted records are excluded.</p>
          {!range && <p role="alert" className="mt-3 text-sm text-rose">Enter both dates, with the end date on or after the start date.</p>}
        </section>
        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose/20 bg-rose-soft p-4 text-sm text-rose"><p>Could not load dashboard statistics. Please try again.</p><button type="button" onClick={() => setRevision(value => value + 1)} className="font-bold underline">Try again</button></div>}
        <div role="status" className="sr-only">{loading ? "Loading dashboard statistics" : data ? "Dashboard statistics updated" : "Statistics unavailable"}</div>
        <section aria-label="Overview statistics" aria-busy={loading} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric, index) => <Link key={metric.table} href={metric.href} className="group rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue/30 hover:shadow-card focus-visible:outline-2 focus-visible:outline-blue sm:p-6">
            <div className="flex items-center justify-between"><span className={`rounded-xl p-3 ${metric.tone}`}><metric.icon size={21} strokeWidth={1.8} /></span><ArrowUpRight size={18} className="text-ink-faint transition group-hover:text-blue-deep" /></div>
            <h2 className="mt-5 text-sm font-bold text-ink-soft">{metric.label}</h2>
            <div className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">{loading ? <span className="my-2 block h-9 w-24 animate-pulse rounded-lg bg-surface" /> : data ? number(data.counts[index]) : "—"}</div>
            <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">{metric.detail} in this period</p>
          </Link>)}
        </section>
        <section aria-labelledby="request-heading" className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-5 sm:px-6">
            <div><h2 id="request-heading" className="text-lg font-extrabold">Request overview</h2><p className="mt-1 text-sm text-ink-soft">Current status of requests received in this period.</p></div>
            <Link href="/requests" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-deep hover:underline">Manage requests <ArrowUpRight size={16} /></Link>
          </div>
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_2fr]">
            <div className="rounded-xl bg-surface p-5">
              <ClipboardList size={22} className="text-blue-deep" />
              <p className="mt-4 text-sm font-bold text-ink-soft">Awaiting action</p>
              <p className="mt-1 text-4xl font-extrabold tabular-nums">{data ? number(pending) : "—"}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{data && requests === 0 ? "No requests were received in this period. Choose a wider date range to see more activity." : "New and contacted requests that may need your follow-up."}</p>
            </div>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {statuses.map((status, index) => {
                const count = data?.statuses[index] ?? 0;
                const share = requests ? Math.round(count / requests * 100) : 0;
                return <div key={status.value} className="self-center">
                  <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-bold"><span className={`h-2 w-2 rounded-full ${status.color}`} />{status.label}</span><span className="text-lg font-extrabold tabular-nums">{data ? number(count) : "—"}</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface" aria-hidden="true"><div className={`h-full rounded-full transition-all ${status.color}`} style={{ width: `${share}%` }} /></div>
                  <p className="mt-2 text-xs text-ink-soft">{status.description}{data ? ` · ${share}%` : ""}</p>
                </div>;
              })}
            </div>
          </div>
        </section>
        <p className="text-right text-xs text-ink-soft">{data ? `Last updated ${data.updated.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : loading ? "Updating your overview…" : "Statistics are unavailable for this selection."}</p>
      </div>
    </div>
  );
}
