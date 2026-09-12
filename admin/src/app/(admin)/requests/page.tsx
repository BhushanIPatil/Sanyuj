"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList, LoaderCircle, Mail, Phone, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { SlideOver } from "@/components/ui/SlideOver";
import { useToast } from "@/components/Toast";

type RequestRow = { id: string; kind: string; name: string; contact: string; details: string; image_path: string; status: string; follow_up_notes: string; created_at: string };
const KINDS: Record<string, string> = { offer: "Offer", notice: "Notification", service: "Service" };
const STATUSES: Record<string, string> = { new: "New", contacted: "Contacted", published: "Published", closed: "Closed" };
const PAGE_SIZE = 25;
export default function RequestsPage() {
  const { showToast } = useToast();
  const loadId = useRef(0);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [total, setTotal] = useState(0);
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
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const requestId = ++loadId.current;
    setLoading(true); setError("");
    try {
      let query = createClient().from("content_requests").select("*", { count: "exact" });
      if (kind) query = query.eq("kind", kind);
      if (status) query = query.eq("status", status);
      if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);
      const { data, error, count } = await query.order("created_at", { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (requestId !== loadId.current) return;
      if (error) throw error;
      setRows(data ?? []); setTotal(count ?? 0);
    } catch { if (requestId === loadId.current) setError("Could not load requests. Please try again."); }
    finally { if (requestId === loadId.current) setLoading(false); }
  }, [kind, status, search, page]);
  // Reload the server page when its filters change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    void createClient().storage.from("request-images").createSignedUrl(selected.image_path, 600).then(({ data, error }) => {
      if (!cancelled) { setImage(data?.signedUrl ?? ""); setImageError(Boolean(error)); }
    }).catch(() => { if (!cancelled) setImageError(true); });
    return () => { cancelled = true; };
  }, [selected]);
  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const { data, error } = await createClient().from("content_requests").update({ status: nextStatus, follow_up_notes: notes.trim() }).eq("id", selected.id).select("id").single();
      if (error || !data) throw error;
      showToast("Follow-up saved"); setSelected(null); await load();
    } catch { showToast("Could not save the follow-up. Please try again."); }
    finally { setSaving(false); }
  }
  return <div className="page-pad">
    <PageHeader title="Requests" action={<button className="btn-secondary flex items-center gap-2" onClick={() => void load()}><RefreshCw size={16} />Refresh</button>} />
    <p className="mt-2 text-sm text-ink-soft">Follow up with people who want to share an offer, notification or service.</p>
    <div className="my-5 flex flex-wrap gap-3 rounded-[18px] border border-line bg-white p-4">
      <label className="flex-1 text-xs font-bold text-ink-soft">Search by name<input className="input-box mt-1 w-full" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Find a request…" /></label>
      <label className="text-xs font-bold text-ink-soft">Type<select className="input-box mt-1 block" value={kind} onChange={e => { setKind(e.target.value); setPage(0); }}><option value="">All types</option>{Object.entries(KINDS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="text-xs font-bold text-ink-soft">Status<select className="input-box mt-1 block" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">All statuses</option>{Object.entries(STATUSES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    </div>
    {error ? <p role="alert" className="rounded-xl bg-rose-soft p-4 text-rose">{error}</p> : <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-card">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-surface text-xs text-ink-soft"><tr>{["Name", "Contact", "Request", "Status", "Received", ""].map((h,i) => <th key={i} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-line">
        {loading ? <tr><td colSpan={6} className="p-10 text-center"><LoaderCircle className="mx-auto animate-spin text-blue-deep" /></td></tr> : rows.length ? rows.map(row => <tr key={row.id} className="hover:bg-surface/60"><td className="px-4 py-4 font-bold">{row.name}<p className="mt-1 font-mono text-[10px] font-normal text-ink-soft">{row.id.slice(0,8).toUpperCase()}</p></td><td className="px-4 py-4">{row.contact}</td><td className="px-4 py-4">{KINDS[row.kind]}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "new" ? "bg-blue-soft text-blue-deep" : "bg-surface text-ink-soft"}`}>{STATUSES[row.status]}</span></td><td className="whitespace-nowrap px-4 py-4 text-xs text-ink-soft">{new Date(row.created_at).toLocaleString()}</td><td className="px-4 py-4"><button className="font-bold text-blue-deep" onClick={() => { setSelected(row); setNotes(row.follow_up_notes); setNextStatus(row.status); setImage(""); setImageError(false); }}>View & follow up</button></td></tr>) : <tr><td colSpan={6} className="p-10 text-center text-ink-soft"><ClipboardList className="mx-auto mb-3" />No requests match these filters.</td></tr>}
      </tbody></table></div>
      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-soft"><span>{total} requests · Page {page + 1}</span><div className="flex gap-4"><button disabled={page === 0 || loading} className="font-bold disabled:opacity-40" onClick={() => setPage(p => p - 1)}>Previous</button><button disabled={(page + 1) * PAGE_SIZE >= total || loading} className="font-bold disabled:opacity-40" onClick={() => setPage(p => p + 1)}>Next</button></div></div>
    </div>}
    {selected ? <SlideOver title={selected.name} subtitle={`${KINDS[selected.kind]} request · ${selected.id.slice(0,8).toUpperCase()}`} onClose={() => { if (!saving) setSelected(null); }} footer={<button disabled={saving} className="btn-primary w-full disabled:opacity-50" onClick={() => void save()}>{saving ? "Saving…" : "Save follow-up"}</button>}>
      <a className="flex items-center gap-2 rounded-[16px] bg-blue-soft p-4 font-bold text-blue-deep" href={selected.contact.includes("@") ? `mailto:${selected.contact}` : `tel:${selected.contact.replace(/[^+\d]/g, "")}`}>{selected.contact.includes("@") ? <Mail size={18} /> : <Phone size={18} />}{selected.contact}</a>
      <h3 className="mb-2 mt-5 text-sm font-bold">Submitted image</h3>
      {image ? <a href={image} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Request attachment" className="max-h-80 w-full rounded-[16px] border border-line object-contain" /></a> : <p className="rounded-xl bg-surface p-6 text-sm text-ink-soft">{imageError ? "Could not load the image. Close and reopen this request to retry." : "Loading image…"}</p>}
      <h3 className="mb-2 mt-5 text-sm font-bold">Request details</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-soft">{selected.details || "No additional details provided."}</p>
      <label className="mt-6 block text-sm font-bold">Follow-up status<select disabled={saving} className="input-box mt-2 w-full" value={nextStatus} onChange={e => setNextStatus(e.target.value)}>{Object.entries(STATUSES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="mt-5 block text-sm font-bold">Internal notes<textarea disabled={saving} maxLength={4000} rows={5} className="input-box mt-2 w-full" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Record your conversation, next steps or publication details…" /></label>
      <p className="mt-2 text-xs leading-5 text-ink-soft">Notes stay private to your team. After follow-up, add the content through Offerly, Notify or Services and update the status here.</p>
    </SlideOver> : null}
  </div>;
}
