"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Tag } from "lucide-react";
import { SanyujBrand } from "@/components/SanyujLogo";
export const APP_NAV = [
  { href: "/app/offerly", label: "Offerly", icon: Tag },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen bg-bg-page">
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <SanyujBrand href="/app/offerly" size={44} priority />
          <nav aria-label="Main navigation" className="flex flex-1 flex-wrap gap-2">
            {APP_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
                className={`flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold ${path === href ? "bg-blue-soft text-blue-deep" : "text-ink-soft"}`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto min-h-screen max-w-6xl bg-bg-app pb-8">{children}</main>
      <footer className="flex justify-center gap-5 p-6 text-sm">
        <Link href="/help">Help</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>
    </div>
  );
}
