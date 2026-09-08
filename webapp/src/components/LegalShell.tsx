import Link from "next/link";
import { SanyujBrand } from "@/components/SanyujLogo";

const FOOTER_LINKS = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/help", label: "Help & Support" },
] as const;

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-page">
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <SanyujBrand href="/" size={44} priority />
          <Link
            href="/auth/login"
            className="rounded-full border border-line bg-white px-4 py-2 text-xs font-bold text-ink shadow-card"
          >
            Open app
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-5 pb-16 pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 h-48 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(46,134,214,0.14),transparent)]"
        />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Sanyuj</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">Last updated: {updated}</p>
          <article className="legal-prose mt-8 space-y-8 text-[15px] leading-relaxed text-ink-soft">
            {children}
          </article>
        </div>
      </main>

      <footer className="border-t border-line bg-white/80 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-sm font-bold text-ink">Sanyuj</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-ink-soft">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-blue-deep">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
