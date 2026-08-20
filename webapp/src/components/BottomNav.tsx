"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Home, Search, User, Inbox } from "lucide-react";

const items = [
  { href: "/app/jobs-feed", label: "New Jobs", icon: Inbox, match: "/app/jobs-feed" },
  { href: "/app/my-jobs", label: "My Jobs", icon: Briefcase, match: "/app/my-jobs" },
  { href: "/app", label: "Home", icon: Home, match: "/app", fab: true },
  { href: "/app/explore", label: "Explore", icon: Search, match: "/app/explore" },
  { href: "/app/profile", label: "Profile", icon: User, match: "/app/profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 flex h-[70px] w-[min(100%-2rem,420px)] -translate-x-1/2 items-center justify-around rounded-[24px] border border-line bg-white shadow-pop">
      {items.map((item) => {
        const active =
          item.match === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.match);
        const Icon = item.icon;
        if (item.fab) {
          return (
            <Link key={item.href} href={item.href} className="-mt-8">
              <span className="flex h-14 w-14 items-center justify-center rounded-[18px] grad-hero text-white shadow-pop">
                <Icon size={22} strokeWidth={2.2} />
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 rounded-[14px] px-3 py-2 ${
              active ? "bg-green-soft" : ""
            }`}
          >
            <Icon
              size={20}
              strokeWidth={1.9}
              className={active ? "text-green-deep" : "text-ink-faint"}
            />
            <span
              className={`text-[9.5px] font-bold ${active ? "text-green-deep" : "text-ink-faint"}`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
