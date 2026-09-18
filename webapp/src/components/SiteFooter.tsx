import Link from "next/link";
import { ExternalLink, MessageCircle } from "lucide-react";
import { SanyujBrand } from "./SanyujLogo";
import { ContactFormLink } from "./ContactFormLink";
import { SOCIAL_LINKS } from "@/lib/siteLinks";
import { PLAY_STORE_URL } from "@/lib/store";

import { SocialIcon } from "./SocialIcon";

export function SiteFooter() {
  return <footer className="border-t border-line bg-bg-page">
    <div className="mx-auto max-w-6xl px-5 pt-12 pb-6 sm:px-8 lg:pt-14">
      <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1.2fr] lg:gap-10">
        <div>
          <SanyujBrand href="/" size={52} light showName nameClassName="font-display text-3xl font-extrabold tracking-tight text-blue-deep" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-ink-soft">Discover local offers, nearby events and neighbourhood updates. Your community, connected through Sanyuj.</p>
          <nav aria-label="Follow Sanyuj" className="mt-5 flex flex-wrap gap-2">
            {SOCIAL_LINKS.map(link => {
              return <a key={link.key} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.name + " (opens in a new tab)"} title={link.name} className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink transition hover:border-blue-deep hover:text-blue-deep focus-visible:outline-2 focus-visible:outline-blue-deep">
                <SocialIcon platform={link.key} />
              </a>;
            })}
          </nav>
        </div>
        <nav aria-label="Company">
          <h2 className="font-display text-base font-extrabold text-ink">Company</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-soft">
            <li><Link href="/about" className="hover:text-blue-deep">About Us</Link></li>
            <li><Link href="/help" className="hover:text-blue-deep">Help &amp; Support</Link></li>
            <li><Link href="/faq" className="hover:text-blue-deep">FAQs</Link></li>
            <li><Link href="/app/requests" className="hover:text-blue-deep">Share an offer or update</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="font-display text-base font-extrabold text-ink">Contact</h2>
          <ContactFormLink className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-deep hover:underline"><MessageCircle size={18} aria-hidden="true" />Contact Us<ExternalLink size={14} aria-hidden="true" /></ContactFormLink>
          <p className="mt-3 text-sm leading-6 text-ink-soft">Have a question or feedback? Send a message through our contact form.</p>
        </div>
        <div>
          <h2 className="font-display text-base font-extrabold text-ink">Get the app</h2>
          <p className="mt-4 text-sm leading-6 text-ink-soft">Take your neighbourhood with you. Explore offers and local updates on Sanyuj for Android.</p>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Get Sanyuj on Google Play (opens in a new tab)" className="mt-4 inline-flex min-h-14 items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 text-ink shadow-sm transition hover:border-blue-deep focus-visible:outline-2 focus-visible:outline-blue-deep">
            <svg viewBox="0 0 24 26" className="h-8 w-8" aria-hidden="true"><path fill="#4285f4" d="M1 1 14 13 1 25Z" /><path fill="#34a853" d="m1 1 16 9-3 3Z" /><path fill="#fbbc04" d="m17 10 6 3-6 3-3-3Z" /><path fill="#ea4335" d="m1 25 13-12 3 3Z" /></svg>
            <span><span className="block text-[9px] font-semibold uppercase tracking-wide text-ink-soft">Get it on</span><span className="block text-xl font-semibold leading-6">Google Play</span></span>
          </a>
        </div>
      </div>
      <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-xs leading-5 text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Sanyuj. All rights reserved.</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2"><Link href="/terms" className="hover:text-blue-deep">Terms of Use</Link><Link href="/privacy" className="hover:text-blue-deep">Privacy Policy</Link></nav>
      </div>
    </div>
  </footer>;
}
