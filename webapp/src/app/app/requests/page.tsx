"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Bell, Check, CheckCircle2, ImagePlus, LoaderCircle, MessageCircle, ShieldCheck, Tag, Wrench, X } from "lucide-react";
import Link from "next/link";

const OPTIONS = [
  { kind: "offer", title: "Share an offer", description: "Let your neighbourhood discover a great deal.", icon: Tag, color: "text-blue-deep bg-blue-soft" },
  { kind: "notice", title: "Post a notification", description: "Share an event, announcement or local update.", icon: Bell, color: "text-indigo bg-indigo-soft" },
  { kind: "service", title: "List a service", description: "Help nearby customers find what you do best.", icon: Wrench, color: "text-green-deep bg-green-soft" },
] as const;
type Kind = typeof OPTIONS[number]["kind"];

export default function RequestsPage() {
  const [kind, setKind] = useState<Kind | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const selected = OPTIONS.find(option => option.kind === kind);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url); // eslint-disable-line react-hooks/set-state-in-effect -- preview mirrors the selected file
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseImage(next?: File) {
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size > 3 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image smaller than 3 MB.");
      if (imageInput.current) imageInput.current.value = "";
      return;
    }
    setError(""); setFile(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !kind) return;
    if (!file) { setError("Please add an image for your request."); imageInput.current?.focus(); return; }
    const body = new FormData(event.currentTarget);
    const contact = String(body.get("contact") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && !(/^\+?[\d\s().-]+$/.test(contact) && contact.replace(/\D/g, "").length >= 8 && contact.replace(/\D/g, "").length <= 15)) {
      setError("Enter a valid phone number or email so we can reach you."); return;
    }
    body.set("kind", kind); body.set("image", file);
    submitting.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/content-requests", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send your request. Please try again.");
      setReceipt(data.id); setFile(null); formRef.current?.reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Check your connection and try again."); }
    finally { submitting.current = false; setBusy(false); }
  }

  if (receipt) return <div className="page-pad flex min-h-[70vh] items-center justify-center">
    <section aria-live="polite" className="w-full max-w-lg rounded-[26px] border border-line bg-white p-7 text-center shadow-card sm:p-10">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-soft text-green-deep"><CheckCircle2 size={38} /></div>
      <p className="text-xs font-bold uppercase tracking-widest text-green-deep">Request received</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">Thank you for reaching out!</h1>
      <p className="mt-4 text-sm leading-7 text-ink-soft">Our team will review your request and contact you using the details you shared to help add your {kind === "notice" ? "notification" : kind} on Sanyuj.</p>
      <div className="my-6 rounded-[18px] bg-surface p-4 text-sm text-ink-soft">Your request is with our team. It will go live after follow-up and review.<p className="mt-2 text-xs">Reference: <span className="font-mono font-bold text-ink">{receipt.slice(0,8).toUpperCase()}</span></p></div>
      <button className="btn-primary w-full" onClick={() => { setReceipt(""); setKind(null); setError(""); }}>Submit another request</button>
      <Link href="/app" className="mt-4 inline-block text-sm font-bold text-blue-deep">Back to Home</Link>
    </section>
  </div>;

  return <div className="page-pad mx-auto max-w-4xl">
    <header className="relative overflow-hidden rounded-[26px] border border-blue-deep/10 bg-gradient-to-br from-blue-soft via-white to-green-soft p-6 sm:p-9">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-blue-deep"><MessageCircle size={14} /> Let’s get you noticed</span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Share it with your neighbourhood.</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">Have an offer, an update or a service to share? Send us the details. We’ll get in touch and help you take the next step.</p>
      <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-ink-soft"><span>01 &nbsp; Choose a type</span><span>02 &nbsp; Share your details</span><span>03 &nbsp; We follow up</span></div>
    </header>
    <section className="mt-7" aria-label="Request type">
      <h2 className="font-display text-lg font-bold">What would you like to share?</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ kind: value, title, description, icon: Icon, color }) => <button key={value} disabled={busy} aria-pressed={kind === value} onClick={() => { setKind(value); setError(""); requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className={`relative rounded-[20px] border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-2 focus-visible:outline-blue-deep ${kind === value ? "border-blue-deep bg-blue-soft/40 ring-1 ring-blue-deep" : "border-line bg-white"}`}>
          <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[14px] ${color}`}><Icon size={21} /></span>
          {kind === value ? <Check className="absolute right-4 top-4 text-blue-deep" size={18} /> : null}
          <span className="block font-display text-base font-extrabold">{title}</span><span className="mt-1.5 block text-xs leading-5 text-ink-soft">{description}</span>
        </button>)}
      </div>
    </section>
    {selected ? <form ref={formRef} onSubmit={submit} className="mt-6 scroll-mt-24 rounded-[24px] border border-line bg-white p-5 shadow-card sm:p-7">
      <h2 className="font-display text-xl font-extrabold">{selected.title}</h2><p className="mt-1 text-sm text-ink-soft">A few details now. A personal follow-up next.</p>
      <fieldset disabled={busy} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-bold">Your name <span className="text-rose">*</span><input required minLength={2} maxLength={100} name="name" autoComplete="name" placeholder="Full name" className="input-box mt-2 w-full" /></label>
          <label className="block text-sm font-bold">Phone number or email <span className="text-rose">*</span><input required maxLength={150} name="contact" placeholder="Where can we reach you?" className="input-box mt-2 w-full" /><span className="mt-1.5 block text-xs font-normal text-ink-soft">We’ll use this to follow up on your request.</span></label>
        </div>
        <label className="block text-sm font-bold">Tell us a little more <span className="font-normal text-ink-soft">(optional)</span><textarea name="details" maxLength={2000} rows={3} placeholder={kind === "service" ? "What services do you provide, and which areas do you serve?" : kind === "offer" ? "Tell us about your offer, business and location." : "What’s happening, where and when?"} className="input-box mt-2 w-full resize-y" /></label>
        <div><p className="text-sm font-bold">Add an image <span className="text-rose">*</span></p><p className="mt-1 text-xs text-ink-soft">A photo, poster or flyer helps us understand your request.</p>
          {file ? <div className="relative mt-3 overflow-hidden rounded-[18px] border border-line bg-surface p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your request attachment" className="mx-auto h-48 w-full object-contain" /><p className="mt-2 truncate text-center text-xs text-ink-soft">{file.name}</p><button type="button" aria-label="Remove image" onClick={() => { setFile(null); if (imageInput.current) imageInput.current.value = ""; }} className="absolute right-3 top-3 rounded-full border border-line bg-white p-2"><X size={16} /></button>
          </div> : <button type="button" onClick={() => imageInput.current?.click()} aria-controls="request-image" className="mt-3 w-full flex cursor-pointer flex-col items-center rounded-[18px] border-2 border-dashed border-blue-deep/20 bg-surface px-4 py-7 text-center transition hover:border-blue-deep/60"><ImagePlus size={28} className="mb-3 text-blue-deep" /><span className="text-sm font-bold text-blue-deep">Choose an image</span><span className="mt-1 text-xs text-ink-soft">JPG, PNG or WebP · Up to 3 MB</span></button>}
          {file ? <button type="button" onClick={() => imageInput.current?.click()} className="mt-2 text-xs font-bold text-blue-deep">Change image</button> : null}
          <input ref={imageInput} id="request-image" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Request image" tabIndex={-1} className="sr-only" onChange={e => chooseImage(e.target.files?.[0])} />
        </div>
        <p className="flex items-start gap-2 text-xs leading-5 text-ink-soft"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-green-deep" /><span>Your contact details are shared only with our team for follow-up. By submitting, you agree to be contacted about this request. <Link href="/privacy" className="text-blue-deep underline">Privacy Policy</Link></span></p>
        {error ? <p role="alert" className="rounded-xl bg-rose-soft p-3 text-sm text-rose">{error}</p> : null}
        <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}{busy ? "Sending your request…" : "Send request"}</button>
      </fieldset>
    </form> : <p className="mt-6 text-center text-sm text-ink-soft">Choose an option above to get started. No account needed.</p>}
  </div>;
}
