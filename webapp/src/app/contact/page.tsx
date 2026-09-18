import { ExternalLink, MessageCircle } from "lucide-react";
import { CONTACT_FORM_URL } from "@/lib/requestForms";

export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-deep">Get in touch</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Contact Us</h1>
      <p className="mt-6 text-base leading-8 text-ink-soft">Have a question, feedback or something to share? Send us a message through our contact form.</p>
      <div className="mt-8 rounded-[24px] border border-line bg-surface p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-soft text-blue-deep"><MessageCircle size={24} aria-hidden="true" /></span>
        <h2 className="mt-5 font-display text-xl font-extrabold text-ink">We would like to hear from you</h2>
        <p className="mt-2 text-sm leading-7 text-ink-soft">Fill in the Google Form with your message and contact details so our team can follow up with you.</p>
        {CONTACT_FORM_URL ? <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-deep px-6 py-3.5 text-sm font-bold text-white transition hover:bg-blue-deep/90">Open contact form <ExternalLink size={17} aria-hidden="true" /></a> : <p className="mt-6 text-sm text-ink-soft">This form is temporarily unavailable. Please try again later.</p>}
        <p className="mt-3 text-xs text-ink-soft">Opens Google Forms in a new tab.</p>
      </div>
    </section>
  );
}
