"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Home,
  Inbox,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

export const APP_NAV = [
  { href: "/app", label: "Home", icon: Home, match: "/app", exact: true },
  { href: "/app/jobs-feed", label: "New Jobs", icon: Inbox, match: "/app/jobs-feed" },
  { href: "/app/my-jobs", label: "My Jobs", icon: Briefcase, match: "/app/my-jobs" },
  { href: "/app/explore", label: "Explore", icon: Search, match: "/app/explore" },
  { href: "/app/profile", label: "Profile", icon: User, match: "/app/profile" },
] as const;

function isActive(pathname: string, match: string, exact?: boolean) {
  if (exact || match === "/app") return pathname === "/app";
  return pathname.startsWith(match);
}

function NavLinks({
  pathname,
  onNavigate,
  variant,
}: {
  pathname: string;
  onNavigate?: () => void;
  variant: "side" | "mobile";
}) {
  return (
    <>
      {APP_NAV.map((item) => {
        const active = isActive(pathname, item.match, "exact" in item ? item.exact : false);
        const Icon = item.icon;
        if (variant === "side") {
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-blue-soft text-blue-deep"
                  : "text-ink-soft hover:bg-surface hover:text-ink"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-[12px] px-1 py-1.5 ${
              active ? "text-blue-deep" : "text-ink-faint"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.9} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] grad-hero text-white shadow-card">
            <Home size={18} strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold leading-none">Sanyuj</p>
            <p className="mt-1 text-[11px] font-semibold text-ink-faint">Local help nearby</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          <NavLinks pathname={pathname} variant="side" />
        </nav>
        <div className="border-t border-line p-4">
          <Link
            href="/app/post-job"
            className="flex w-full items-center justify-center rounded-[14px] grad-hero px-4 py-3 text-sm font-bold text-white shadow-card"
          >
            Post a job
          </Link>
        </div>
      </aside>

      {/* Top bar (mobile + tablet) */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/app" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] grad-hero text-white">
              <Home size={15} strokeWidth={2.2} />
            </span>
            <span className="font-display text-base font-extrabold">Sanyuj</span>
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-line bg-white"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {menuOpen ? (
          <nav className="space-y-1 border-t border-line bg-white px-3 py-3">
            <NavLinks
              pathname={pathname}
              variant="side"
              onNavigate={() => setMenuOpen(false)}
            />
            <Link
              href="/app/post-job"
              onClick={() => setMenuOpen(false)}
              className="mt-2 flex w-full items-center justify-center rounded-[14px] grad-hero px-4 py-3 text-sm font-bold text-white"
            >
              Post a job
            </Link>
          </nav>
        ) : null}
      </header>

      {/* Main */}
      <div className="lg:pl-64">
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] w-full max-w-6xl bg-bg-app pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:min-h-screen lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
          <NavLinks pathname={pathname} variant="mobile" />
        </div>
      </nav>
    </div>
  );
}
