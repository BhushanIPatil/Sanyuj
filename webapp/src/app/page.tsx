import Link from "next/link";
import { ArrowRight, Bell, MapPin, Sparkles, Tag } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      <section className="relative isolate px-5 pb-12 pt-14 text-center sm:px-8 sm:pb-16 sm:pt-20">
        <div className="mx-auto max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-deep/10 bg-white px-4 py-2 text-xs font-extrabold tracking-wide text-blue-deep shadow-card"><Sparkles size={15} aria-hidden="true" /> YOUR NEIGHBOURHOOD, CONNECTED</p>
          <h1 className="mt-7 font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-ink sm:text-6xl lg:text-7xl">Offers to discover.<br /><span className="bg-gradient-to-r from-blue-deep to-green-deep bg-clip-text text-transparent">Updates that matter.</span></h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg">Explore offers and local announcements in one place. Choose an area to see what is relevant to you. No account needed.</p>
          <p className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft"><MapPin size={14} aria-hidden="true" /> Local discoveries. One simple place.</p>
        </div>
      </section>
      <section aria-label="Explore Sanyuj" className="mx-auto grid max-w-4xl gap-4 px-5 pb-8 sm:grid-cols-2 sm:gap-5 sm:px-8">
        <Link href="/app/offerly" className="group rounded-[26px] border border-amber-200/70 bg-bg-app p-6 transition hover:-translate-y-1 hover:shadow-card sm:p-8">
          <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><Tag size={23} aria-hidden="true" /></span><ArrowRight size={20} className="text-amber-800 transition group-hover:translate-x-1" aria-hidden="true" /></div>
          <h2 className="mt-5 font-display text-2xl font-extrabold">A little more to discover.</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">Find offers from businesses around you, all together in Offerly.</p>
          <span className="mt-5 inline-block text-sm font-extrabold text-amber-800">Browse offers</span>
        </Link>
        <Link href="/app/notifications" className="group rounded-[26px] border border-teal-200/70 bg-bg-app p-6 transition hover:-translate-y-1 hover:shadow-card sm:p-8">
          <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-800"><Bell size={23} aria-hidden="true" /></span><ArrowRight size={20} className="text-teal-800 transition group-hover:translate-x-1" aria-hidden="true" /></div>
          <h2 className="mt-5 font-display text-2xl font-extrabold">Feel closer to what?s happening.</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">Keep up with local announcements, events and updates on Notify.</p>
          <span className="mt-5 inline-block text-sm font-extrabold text-teal-800">Explore notifications</span>
        </Link>
      </section>
    </div>
  );
}
