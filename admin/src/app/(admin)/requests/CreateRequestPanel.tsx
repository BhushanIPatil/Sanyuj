"use client";

import { useState } from "react";
import { SlideOver } from "@/components/ui/SlideOver";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { PaymentFields, paymentAmount } from "./PaymentFields";

type EditableRequest = {
  id: string; kind: string; name: string; contact: string; details: string;
  follow_up_notes: string; status: string; payment_amount: number | null;
  payment_status: string; image_path: string | null;
};

export function CreateRequestPanel({ request, linked = false, onClose, onCreated }: {
  request?: EditableRequest; linked?: boolean; onClose: () => void; onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [kind, setKind] = useState(request?.kind ?? "offer");
  const [name, setName] = useState(request?.name ?? "");
  const [contact, setContact] = useState(request?.contact ?? "");
  const [details, setDetails] = useState(request?.details ?? "");
  const [notes, setNotes] = useState(request?.follow_up_notes ?? "");
  const [status, setStatus] = useState(request?.status ?? "new");
  const [amount, setAmount] = useState(request?.payment_amount == null ? "" : String(request.payment_amount));
  const [payment, setPayment] = useState(request?.payment_status ?? "unpaid");
  const [removeImage, setRemoveImage] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (saving) return;
    setError("");
    if (name.trim().length < 2 || name.trim().length > 100 || contact.trim().length < 6 || contact.trim().length > 150) {
      setError("Enter a name (2–100 characters) and phone number or email (6–150 characters)."); return;
    }
    let parsedAmount: number | null;
    try { parsedAmount = paymentAmount(amount); }
    catch (e) { setError((e as Error).message); return; }
    const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    if (file && (!extensions[file.type] || file.size === 0 || file.size > 3 * 1024 * 1024)) {
      setError("Choose a JPEG, PNG or WebP image up to 3 MB."); return;
    }
    setSaving(true);
    const client = createClient();
    let imagePath: string | null = removeImage ? null : request?.image_path ?? null;
    let uploaded = false;
    try {
      if (file) {
        imagePath = `admin/${crypto.randomUUID()}.${extensions[file.type]}`;
        const { error } = await client.storage.from("request-images").upload(imagePath, file, { contentType: file.type });
        if (error) throw error;
        uploaded = true;
      }
      const payload = {
        kind, name: name.trim(), contact: contact.trim(), details: details.trim(),
        image_path: imagePath, status, follow_up_notes: notes.trim(),
        payment_amount: parsedAmount, payment_status: payment,
      };
      const query = request
        ? client.from("content_requests").update(payload).eq("id", request.id)
        : client.from("content_requests").insert(payload);
      const { error } = await query.select("id").single();
      if (error) throw error;
    } catch {
      if (uploaded && imagePath) {
        try { await client.storage.from("request-images").remove([imagePath]); } catch { /* Keep form available for retry. */ }
      }
      setError(request ? "Could not update the request. If changing its type, unlink its ad or notice first, then retry." : "Could not create the request. Please try again.");
      setSaving(false);
      return;
    }
    let cleanupFailed = false;
    if (request?.image_path && request.image_path !== imagePath) {
      try {
        const { error } = await client.storage.from("request-images").remove([request.image_path]);
        cleanupFailed = Boolean(error);
      } catch { cleanupFailed = true; }
    }
    showToast(cleanupFailed ? "Request updated, but the old image could not be removed from storage." : request ? "Request updated" : "Request created");
    onCreated();
  }

  return <SlideOver title={request ? "Edit request" : "Create request"} subtitle={request ? "Update request details." : "Enter a request received through Google Forms."} onClose={() => { if (!saving) onClose(); }} footer={<button type="submit" form="create-request" disabled={saving} className="btn-primary w-full disabled:opacity-50">{saving ? "Saving…" : request ? "Save changes" : "Create request"}</button>}>
    <form id="create-request" onSubmit={e => { e.preventDefault(); void save(); }}>
      <fieldset disabled={saving} className="space-y-5">
        <label className="block text-sm font-bold">Type<select disabled={linked} className="input-box mt-2 w-full" value={kind} onChange={e => setKind(e.target.value)}><option value="offer">Offer</option><option value="notice">Notification</option></select></label>
        {linked ? <p className="text-xs text-ink-soft">Unlink the ad or notice before changing the request type.</p> : null}
        <label className="block text-sm font-bold">Name<input required minLength={2} maxLength={100} className="input-box mt-2 w-full" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="block text-sm font-bold">Phone number or email<input required minLength={6} maxLength={150} className="input-box mt-2 w-full" value={contact} onChange={e => setContact(e.target.value)} /></label>
        <label className="block text-sm font-bold">Request details<textarea maxLength={2000} rows={4} className="input-box mt-2 w-full" value={details} onChange={e => setDetails(e.target.value)} /></label>
        <label className="block text-sm font-bold">Image (optional)<input type="file" accept="image/jpeg,image/png,image/webp" className="input-box mt-2 w-full" onChange={e => setFile(e.target.files?.[0] ?? null)} /><span className="mt-1 block text-xs font-normal text-ink-soft">JPEG, PNG or WebP, up to 3 MB.</span></label>
        {request?.image_path ? <label className="block text-sm"><input type="checkbox" checked={removeImage} onChange={e => setRemoveImage(e.target.checked)} /> Remove existing image<span className="mt-1 block text-xs text-ink-soft">The existing image is kept unless removed or replaced with a new file.</span></label> : null}
        <label className="block text-sm font-bold">Follow-up status<select className="input-box mt-2 w-full" value={status} onChange={e => setStatus(e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="published">Published</option><option value="closed">Closed</option></select></label>
        <PaymentFields amount={amount} status={payment} disabled={saving} onAmount={setAmount} onStatus={setPayment} />
        <label className="block text-sm font-bold">Internal notes<textarea maxLength={4000} rows={4} className="input-box mt-2 w-full" value={notes} onChange={e => setNotes(e.target.value)} /></label>
      </fieldset>
      {error ? <p role="alert" className="mt-4 text-sm text-rose">{error}</p> : null}
    </form>
  </SlideOver>;
}
