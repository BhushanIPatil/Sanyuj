import type { Metadata } from "next";
import Link from "next/link";
import { Bell, MapPin, Send, Tag } from "lucide-react";

const title = "About Sanyuj | Local Offers & Neighbourhood Updates";
const description = "Discover local business offers, nearby events and neighbourhood announcements with Sanyuj. Explore Offerly and Notify by pincode, locality and date, without an account.";
export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: "/about" },
  openGraph: { title, description, url: "/about", type: "website" },
};

const FEATURES = [
  { title: "Find local business offers with Offerly", icon: Tag, href: "/app/offerly", action: "Explore local offers", text: "Looking for offers near you? Offerly brings local business promotions together so you can browse by category, pincode, locality and area. Check each offer for its dates, details and advertiser's terms before you visit." },
  { title: "Discover nearby events and local announcements", icon: Bell, href: "/app/notifications", action: "Browse neighbourhood updates", text: "Stay connected to your neighbourhood with Notify. Explore community announcements, local events and updates, and use date filters to find what is happening today or in the coming days." },
  { title: "Share an offer or community update", icon: Send, href: "/app/requests", action: "Share with your neighbourhood", text: "Have a local business offer, event or announcement to share? Choose Offer or Notification on the Share page and complete the relevant form. Our team reviews your request and follows up before publication." },
];

export default function AboutPage() {
  return <section className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
    <p className="text-xs font-bold uppercase tracking-wide text-blue-deep">About Sanyuj</p>
    <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">Local offers. Nearby events. A more connected neighbourhood.</h1>
    <p className="mt-6 text-base leading-8 text-ink-soft">Sanyuj is a local discovery app for finding business offers, neighbourhood announcements and community events in one place. Whether you want to explore offers near you or keep up with local updates, choose your area and discover what is relevant to you.</p>
    <div className="mt-8 flex items-start gap-3 rounded-2xl bg-blue-soft p-5"><MapPin className="mt-1 shrink-0 text-blue-deep" size={22} aria-hidden="true" /><p className="text-sm leading-7 text-ink-soft">Search by pincode, locality or area, and narrow your results by category and date. You can browse Sanyuj without creating an account.</p></div>
    <div className="mt-8 space-y-5">
      {FEATURES.map(({ title, icon: Icon, href, action, text }) => <section key={href} className="rounded-3xl border border-line bg-white p-6 sm:p-8">
        <Icon size={26} className="text-blue-deep" aria-hidden="true" />
        <h2 className="mt-4 font-display text-xl font-extrabold text-ink">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-ink-soft">{text}</p>
        <Link href={href} className="mt-4 inline-block text-sm font-bold text-blue-deep hover:underline">{action} &rarr;</Link>
      </section>)}
    </div>
    <div className="mt-8 rounded-2xl bg-surface p-6"><h2 className="font-display text-lg font-extrabold">New to Sanyuj?</h2><p className="mt-2 text-sm leading-7 text-ink-soft">Find answers about discovering local offers, filtering nearby events and sharing updates in our <Link href="/faq" className="font-semibold text-blue-deep hover:underline">frequently asked questions</Link>, or visit <Link href="/help" className="font-semibold text-blue-deep hover:underline">Help &amp; Support</Link>.</p></div>
  </section>;
}
