"use client";

import { useState } from "react";
import { Bell, Check, ExternalLink, MessageCircle, Tag } from "lucide-react";
import { OFFER_REQUEST_FORM_URL, NOTIFICATION_REQUEST_FORM_URL } from "@/lib/requestForms";

const OPTIONS = [
  { kind: "offer", title: "Share an offer", description: "Let your neighbourhood discover a great deal.", icon: Tag, color: "text-amber-800 bg-amber-100", card: "border-amber-200 bg-amber-50", selected: "border-amber-600 bg-amber-100 ring-1 ring-amber-600", url: OFFER_REQUEST_FORM_URL },
  { kind: "notice", title: "Post a notification", description: "Share an event, announcement or local update.", icon: Bell, color: "text-teal-800 bg-teal-100", card: "border-teal-200 bg-teal-50", selected: "border-teal-600 bg-teal-100 ring-1 ring-teal-600", url: NOTIFICATION_REQUEST_FORM_URL },
] as const;

export default function RequestsPage() {
  const [kind, setKind] = useState<string>("offer");
  const selected = OPTIONS.find(option => option.kind === kind);
  return <div className="page-pad mx-auto max-w-4xl">
    <header className="relative overflow-hidden rounded-[26px] border border-blue-deep/10 bg-gradient-to-br from-blue-soft via-white to-green-soft p-6 sm:p-9">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-blue-deep"><MessageCircle size={14} /> Let’s get you noticed</span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Share it with your neighbourhood.</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">Have an offer or an update to share? Complete the Google Form with your details. We’ll get in touch and help you take the next step.</p>
      <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-ink-soft"><span>01 &nbsp; Choose a type</span><span>02 &nbsp; Fill in Google Form</span><span>03 &nbsp; We follow up</span></div>
    </header>
    <section className="mt-7" aria-label="Request type">
      <h2 className="font-display text-lg font-bold">What would you like to share?</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(option => <button type="button" key={option.kind} aria-pressed={kind === option.kind} onClick={() => setKind(option.kind)} className={"relative rounded-[20px] border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-2 focus-visible:outline-blue-deep " + (kind === option.kind ? option.selected : option.card)}>
          <span className={"mb-4 flex h-11 w-11 items-center justify-center rounded-[14px] " + option.color}><option.icon size={21} /></span>
          {kind === option.kind ? <Check className="absolute right-4 top-4 text-ink" size={18} /> : null}
          <span className="block font-display text-base font-extrabold">{option.title}</span><span className="mt-1.5 block text-xs leading-5 text-ink-soft">{option.description}</span>
        </button>)}
      </div>
    </section>
    {selected ? <section className="mt-6 rounded-[24px] border border-line bg-white p-5 shadow-card sm:p-7">
      <h2 className="font-display text-xl font-extrabold">{selected.title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">Fill in the Google Form to send your request. Our team will review your details and follow up with you.</p>
      {selected.url ? <a href={selected.url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5 flex items-center justify-center gap-2"><ExternalLink size={18} />Open {kind === "offer" ? "offer" : "notification"} request form</a> : <p className="mt-5 text-sm text-ink-soft">This form is temporarily unavailable. Please try again later.</p>}
      <p className="mt-3 text-xs text-ink-soft">Opens Google Forms in a new tab.</p>
    </section> : <p className="mt-6 text-center text-sm text-ink-soft">Choose an option above to get started.</p>}
  </div>;
}
