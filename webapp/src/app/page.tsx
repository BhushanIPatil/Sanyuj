import Link from "next/link";
import { SanyujBrand } from "@/components/SanyujLogo";
export default function LandingPage() {
  return <main className="min-h-screen bg-bg-page px-6 py-8">
    <div className="mx-auto max-w-5xl">
      <SanyujBrand href="/" size={48} priority />
      <section className="py-20">
        <p className="font-bold text-blue-deep">OFFERS, NOTIFICATIONS & SERVICES</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold sm:text-6xl">Offers to discover. Updates to keep you informed.</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">Explore offers, local services and announcements in one place. Choose an area to see what is relevant to you. No account needed.</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/app" className="rounded-xl bg-blue-deep px-6 py-3 font-bold text-white">Explore Sanyuj</Link>
          <Link href="/app/notifications" className="rounded-xl border border-line bg-white px-6 py-3 font-bold">View notifications</Link>
        </div>
      </section>
      <footer className="flex gap-6 border-t border-line py-6">
        <Link href="/help">Help</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </div>
  </main>;
}
