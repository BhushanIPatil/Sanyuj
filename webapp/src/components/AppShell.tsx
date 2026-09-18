"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardPlus, Grid2X2, Sun, Tag } from "lucide-react";
import { useUserLocation } from "@/components/UserLocation";
import { SiteFooter } from "@/components/SiteFooter";
import { SanyujBrand } from "@/components/SanyujLogo";

export const APP_NAV = [
  { href: "/app/offerly", label: "Offerly", icon: Tag },
  { href: "/app/notifications", label: "Notify", icon: Bell },
  { href: "/app/requests", label: "Share", icon: ClipboardPlus },
  { href: "/app/sanyuj", label: "Sanyuj", icon: Grid2X2 },
] as const;

function NavLinks({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  return APP_NAV.map(({ href, label, icon: Icon }) => {
    const active = pathname.startsWith(href);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}
      className={
        (mobile ? "flex min-h-14 min-w-0 flex-1 flex-col justify-center gap-1 text-[11px] " : "inline-flex gap-1.5 px-3 py-2 text-sm ") +
        "items-center rounded-xl font-semibold transition " +
        (active ? "bg-blue-deep text-white" : "text-ink-soft hover:bg-surface hover:text-ink")
      }>
      <Icon size={mobile ? 21 : 16} aria-hidden="true" />
      <span>{label}</span>
    </Link>;
  });
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address } = useUserLocation();
  const addressLine = address || "Set your location in filters";

  return <div className="flex min-h-screen flex-col bg-bg-page pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 lg:h-16 lg:px-6">
        <SanyujBrand href="/app" size={44} light showName nameClassName="hidden font-display text-xl font-extrabold tracking-tight text-ink sm:block" priority />
        <nav aria-label="Main navigation" className="ml-2 hidden items-center gap-0.5 lg:flex">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="ml-auto min-w-0 max-w-[42vw] text-right sm:max-w-[240px]">
          <p className="flex items-center justify-end gap-1.5 text-sm font-bold text-ink">Hi there <Sun size={18} className="text-amber" aria-hidden="true" /></p>
          <p className="mt-0.5 truncate text-[11px] text-ink-soft" title={addressLine}>{addressLine}</p>
        </div>
      </div>
    </header>
    <main className="mx-auto w-full max-w-6xl flex-1 bg-bg-app pb-8">{children}</main>
    <SiteFooter />
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 bg-bg-page/95 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg gap-1 rounded-3xl border border-line bg-white p-2 shadow-card">
        <NavLinks pathname={pathname} mobile />
      </div>
    </nav>
  </div>;
}
