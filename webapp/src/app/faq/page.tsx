import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ContactFormLink } from "@/components/ContactFormLink";
import { FAQS } from "@/lib/faqs";

const title = "Sanyuj FAQs | Local Offers, Events & Community Updates";
const description = "Learn how to find offers near you, discover local events, filter neighbourhood updates and share a business offer or announcement on Sanyuj.";
export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: "/faq" },
  openGraph: { title, description, url: "/faq", type: "website" },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: FAQS.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
  return <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <p className="text-xs font-bold uppercase tracking-wide text-blue-deep">Sanyuj FAQs</p>
    <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Your questions about local offers and updates, answered.</h1>
    <p className="mt-5 text-base leading-7 text-ink-soft">Get started with Offerly and Notify, discover your neighbourhood and learn how to share something with your community.</p>
    <div className="mt-8 space-y-3">
      {FAQS.map(faq => <details key={faq.question} className="group rounded-2xl border border-line bg-white p-5 open:bg-blue-soft/30">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-display font-bold text-ink [&::-webkit-details-marker]:hidden"><h2 className="text-base">{faq.question}</h2><ChevronDown size={19} className="mt-0.5 shrink-0 text-blue-deep transition group-open:rotate-180" aria-hidden="true" /></summary>
        <p className="mt-4 text-sm leading-7 text-ink-soft">{faq.answer}</p>
      </details>)}
    </div>
    <p className="mt-8 text-sm leading-7 text-ink-soft">Still need help? <ContactFormLink className="font-bold text-blue-deep hover:underline">Contact Us</ContactFormLink> or visit <Link href="/help" className="font-bold text-blue-deep hover:underline">Help &amp; Support</Link>.</p>
  </section>;
}
