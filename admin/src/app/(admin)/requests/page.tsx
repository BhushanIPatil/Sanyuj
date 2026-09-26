"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, Banknote, CheckCircle, ClipboardList, Clock, LoaderCircle, Mail, Pencil, Phone, Plus, RefreshCw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { SlideOver } from "@/components/ui/SlideOver";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

import { CreateRequestPanel } from "./CreateRequestPanel";
import { PaymentFields, paymentAmount } from "./PaymentFields";
import { CONTENT_FIELDS, servingStatus, type LinkedContent } from "./servingStatus";
import { formatMoney } from "@/lib/format";

type RequestRow = { content: LinkedContent[]; id: string; kind: string; name: string; contact: string; details: string; image_path: string | null; payment_amount: number | null; payment_status: string; status: string; follow_up_notes: string; created_at: string };
const KINDS: Record<string, string> = { offer: "Offer", notice: "Notification" };
const STATUSES: Record<string, string> = { new: "New", contacted: "Contacted", published: "Published", closed: "Closed" };
const PAGE_SIZE = 25;
const STAT_FILTERS = [null, ["payment_status", "paid"], ["payment_status", "unpaid"], ["status", "new"], ["status", "contacted"], ["status", "published"], ["status", "closed"]] as const;
export default function RequestsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [editing, setEditing] = useState<RequestRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const loadId = useRef(0);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<number[] | null>(null);
  const [page, setPage] = useState(0);
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [image, setImage] = useState("");
  const [imageError, setImageError] = useState(false);
  const [notes, setNotes] = useState("");
  const [nextStatus, setNextStatus] = useState("new");
  const [creating, setCreating] = useState(false);
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState("unpaid");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const requestId = ++loadId.current;
    setLoading(true); setError(""); setStats(null);
    try {
      let query = createClient().from("content_requests").select("*", { count: "exact" });
      if (kind) query = query.eq("kind", kind);
      if (status) query = query.eq("status", status);
      if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);
      const [pageResult, statResults] = await Promise.all([
        query.order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
        Promise.all(STAT_FILTERS.map(filter => {
          let countQuery = createClient().from("content_requests").select("id", { count: "exact", head: true });
          if (filter) countQuery = countQuery.eq(filter[0], filter[1]);
          return countQuery;
        })),
      ]);
      const { data, error, count } = pageResult;
      for (const result of statResults) if (result.error) throw result.error;
      if (requestId !== loadId.current) return;
      if (error) throw error;
      const requests = data ?? [];
      const ids = requests.map(row => row.id);
      const content: (LinkedContent & { request_id: string })[] = [];
      if (ids.length) {
        const client = createClient();
        const results = await Promise.all([
          client.from("ads").select(`request_id,${CONTENT_FIELDS}`).in("request_id", ids),
          client.from("notices").select(`request_id,${CONTENT_FIELDS}`).in("request_id", ids),
        ]);
        for (const result of results) {
          if (result.error) throw result.error;
          content.push(...(result.data ?? []));
        }
      }
      if (requestId !== loadId.current) return;
      setStats(statResults.map(result => result.count ?? 0));
      setRows(requests.map(row => ({ ...row, content: content.filter(item => item.request_id === row.id) }))); setTotal(count ?? 0);
    } catch { if (requestId === loadId.current) setError("Could not load requests. Please try again."); }
    finally { if (requestId === loadId.current) setLoading(false); }
  }, [kind, status, search, page]);
  // Reload the server page when its filters change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selected?.image_path) return;
    let cancelled = false;
    void createClient().storage.from("request-images").createSignedUrl(selected.image_path, 600).then(({ data, error }) => {
      if (!cancelled) { setImage(data?.signedUrl ?? ""); setImageError(Boolean(error)); }
    }).catch(() => { if (!cancelled) setImageError(true); });
    return () => { cancelled = true; };
  }, [selected]);
  function openRequest(row: RequestRow) {
    if (deleting) return;
    setSelected(row);
    setAmount(row.payment_amount == null ? "" : String(row.payment_amount));
    setPayment(row.payment_status);
    setNotes(row.follow_up_notes);
    setNextStatus(row.status);
    setImage("");
    setImageError(false);
  }
  async function save() {
    if (!selected || saving) return;
    let parsedAmount: number | null;
    try { parsedAmount = paymentAmount(amount); }
    catch (e) { showToast((e as Error).message); return; }
    setSaving(true);
    try {
      const { data, error } = await createClient().from("content_requests").update({ status: nextStatus, follow_up_notes: notes.trim(), payment_amount: parsedAmount, payment_status: payment }).eq("id", selected.id).select("id").single();
      if (error || !data) throw error;
      showToast("Follow-up saved"); setSelected(null); await load();
    } catch { showToast("Could not save the follow-up. Please try again."); }
    finally { setSaving(false); }
  }
  async function remove(row: RequestRow) {
    if (deleting) return;
    setDeleting(true);
    try {
      const approved = await confirm({ title: "Delete request?", message: `Permanently delete the request from "${row.name}" and its image? Linked ads and notices will remain, with their request link cleared.`, confirmLabel: "Delete", tone: "danger" });
      if (!approved) return;
      const client = createClient();
      const { data, error } = await client.from("content_requests").delete().eq("id", row.id).select("image_path").single();
      if (error || !data) throw error;
      let cleanupFailed = false;
      if (data.image_path) {
        try {
          const { error } = await client.storage.from("request-images").remove([data.image_path]);
          cleanupFailed = Boolean(error);
        } catch { cleanupFailed = true; }
      }
      setSelected(null);
      showToast(cleanupFailed ? "Request deleted, but its image could not be removed from storage." : "Request deleted");
      if (rows.length === 1 && page > 0) setPage(p => p - 1);
      else await load();
    } catch { showToast("Could not delete the request. Please try again."); }
    finally { setDeleting(false); }
  }
  return <div className="page-pad">
    <PageHeader title="Requests" action={<div className="flex gap-2"><button className="btn-primary flex items-center gap-2" onClick={() => setCreating(true)}><Plus size={16} />Create request</button><button className="btn-secondary flex items-center gap-2" onClick={() => void load()}><RefreshCw size={16} />Refresh</button></div>} />
    <p className="mt-2 text-sm text-ink-soft">Follow up with people who want to share an offer or notification.</p>
    <section className="mt-5" aria-label="Request statistics">
      <p className="mb-2 text-xs text-ink-soft">Across all requests</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total requests" value={stats?.[0] ?? "?"} icon={ClipboardList} />
        <StatCard label="Total paid" value={stats?.[1] ?? "?"} icon={Banknote} tone="green" />
        <StatCard label="Total unpaid" value={stats?.[2] ?? "?"} icon={Banknote} tone="amber" />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New" value={stats?.[3] ?? "?"} icon={Clock} tone="blue" />
        <StatCard label="Contacted" value={stats?.[4] ?? "?"} icon={Phone} tone="indigo" />
        <StatCard label="Published" value={stats?.[5] ?? "?"} icon={CheckCircle} tone="green" />
        <StatCard label="Closed" value={stats?.[6] ?? "?"} icon={Archive} tone="teal" />
      </div>
    </section>
    <div className="my-5 flex flex-wrap gap-3 rounded-[18px] border border-line bg-white p-4">
      <label className="flex-1 text-xs font-bold text-ink-soft">Search by name<input className="input-box mt-1 w-full" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Find a request…" /></label>
      <label className="text-xs font-bold text-ink-soft">Type<select className="input-box mt-1 block" value={kind} onChange={e => { setKind(e.target.value); setPage(0); }}><option value="">All types</option>{Object.entries(KINDS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="text-xs font-bold text-ink-soft">Status<select className="input-box mt-1 block" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">All statuses</option>{Object.entries(STATUSES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    </div>
    {error ? <p role="alert" className="rounded-xl bg-rose-soft p-4 text-rose">{error}</p> : <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-card">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-surface text-xs text-ink-soft"><tr>{["Name", "Contact", "Request", "Status", "Serving status", "Payment amount", "Payment", "Received", "Actions"].map((h,i) => <th key={i} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-line">
        {loading ? <tr><td colSpan={9} className="p-10 text-center"><LoaderCircle className="mx-auto animate-spin text-blue-deep" /></td></tr> : rows.length ? rows.map(row => <tr key={row.id} tabIndex={0} aria-label={`Open request from ${row.name}`} className="cursor-pointer hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-blue-deep" onClick={() => openRequest(row)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openRequest(row); } }}><td className="px-4 py-4 font-bold">{row.name}<p className="mt-1 font-mono text-[10px] font-normal text-ink-soft">{row.id.slice(0,8).toUpperCase()}</p></td><td className="px-4 py-4">{row.contact}</td><td className="px-4 py-4">{KINDS[row.kind]}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "new" ? "bg-blue-soft text-blue-deep" : "bg-surface text-ink-soft"}`}>{STATUSES[row.status]}</span></td><td className="whitespace-nowrap px-4 py-4">{row.content.length ? row.content.map(item => <p key={item.id} title={item.title}>{row.content.length > 1 ? `${item.title}: ` : ""}{servingStatus(item, now)}</p>) : "Not linked"}</td><td className="whitespace-nowrap px-4 py-4">{formatMoney(row.payment_amount)}</td><td className="px-4 py-4">{row.payment_status === "paid" ? "Paid" : "Unpaid"}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-ink-soft">{new Date(row.created_at).toLocaleString()}</td><td className="px-4 py-4" onClick={e => e.stopPropagation()}><div className="flex gap-2"><button type="button" disabled={deleting} aria-label={`Edit request from ${row.name}`} title="Edit request" className="rounded-lg p-2 text-blue-deep hover:bg-blue-soft disabled:opacity-50" onClick={() => setEditing(row)}><Pencil size={16} /></button><button type="button" disabled={deleting} aria-label={`Delete request from ${row.name}`} title="Delete request" className="rounded-lg p-2 text-rose hover:bg-rose-soft disabled:opacity-50" onClick={() => void remove(row)}><Trash2 size={16} /></button></div></td></tr>) : <tr><td colSpan={9} className="p-10 text-center text-ink-soft"><ClipboardList className="mx-auto mb-3" />No requests match these filters.</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-soft"><span>{total} requests · Page {page + 1}</span><div className="flex gap-4"><button disabled={page === 0 || loading} className="font-bold disabled:opacity-40" onClick={() => setPage(p => p - 1)}>Previous</button><button disabled={(page + 1) * PAGE_SIZE >= total || loading} className="font-bold disabled:opacity-40" onClick={() => setPage(p => p + 1)}>Next</button></div></div>
    </div>}
    {editing ? <CreateRequestPanel key={editing.id} request={editing} linked={editing.content.length > 0} onClose={() => setEditing(null)} onCreated={() => { setEditing(null); void load(); }} /> : null}
    {creating ? <CreateRequestPanel onClose={() => setCreating(false)} onCreated={() => { setCreating(false); if (page === 0) void load(); else setPage(0); }} /> : null}
    {selected ? <SlideOver title={selected.name} subtitle={`${KINDS[selected.kind]} request · ${selected.id.slice(0,8).toUpperCase()}`} onClose={() => { if (!saving) setSelected(null); }} footer={<button disabled={saving} className="btn-primary w-full disabled:opacity-50" onClick={() => void save()}>{saving ? "Saving…" : "Save follow-up"}</button>}>
      {selected.contact === "Not recorded" ? <p className="text-sm text-ink-soft">Contact not recorded on the original ad.</p> : <a className="flex items-center gap-2 rounded-[16px] bg-blue-soft p-4 font-bold text-blue-deep" href={selected.contact.includes("@") ? `mailto:${selected.contact}` : `tel:${selected.contact.replace(/[^+\d]/g, "")}`}>{selected.contact.includes("@") ? <Mail size={18} /> : <Phone size={18} />}{selected.contact}</a>}
      <h3 className="mb-2 mt-5 text-sm font-bold">Submitted image</h3>
      {!selected.image_path ? <p className="rounded-xl bg-surface p-6 text-sm text-ink-soft">No image attached.</p> : image ? <a href={image} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Request attachment" className="max-h-80 w-full rounded-[16px] border border-line object-contain" /></a> : <p className="rounded-xl bg-surface p-6 text-sm text-ink-soft">{imageError ? "Could not load the image. Close and reopen this request to retry." : "Loading image…"}</p>}
      <h3 className="mb-2 mt-5 text-sm font-bold">Request details</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-soft">{selected.details || "No additional details provided."}</p>
      <label className="mt-6 block text-sm font-bold">Follow-up status<select disabled={saving} className="input-box mt-2 w-full" value={nextStatus} onChange={e => setNextStatus(e.target.value)}>{Object.entries(STATUSES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <div className="mt-5 text-sm"><h3 className="font-bold">Serving status</h3>{selected.content.length ? selected.content.map(item => <p key={item.id} className="mt-2">{item.title}: {servingStatus(item, now)}</p>) : <p className="mt-2">Not linked</p>}</div>
      <PaymentFields amount={amount} status={payment} disabled={saving} onAmount={setAmount} onStatus={setPayment} />
      <label className="mt-5 block text-sm font-bold">Internal notes<textarea disabled={saving} maxLength={4000} rows={5} className="input-box mt-2 w-full" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Record your conversation, next steps or publication details…" /></label>
      <p className="mt-2 text-xs leading-5 text-ink-soft">Notes stay private to your team. After follow-up, add the content through Offerly or Notify and update the status here.</p>
    </SlideOver> : null}
  </div>;
}
