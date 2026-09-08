import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Policies",
  description: "Sanyuj Terms of Use, Privacy Policy, and Help & Support.",
};

const UPDATED = "7 September 2026";

const LINKS = [
  {
    href: "/terms",
    title: "Terms of Use",
    body: "How Sanyuj works, free use for everyone, and sponsored ads for businesses.",
  },
  {
    href: "/privacy",
    title: "Privacy Policy",
    body: "What data we collect, how we use it, and your choices including account deletion.",
  },
  {
    href: "/help",
    title: "Help & Support",
    body: "FAQs, advertising inquiries, and how to reach support@sanyuj.app.",
  },
] as const;

export default function PoliciesHubPage() {
  return (
    <LegalShell title="Policies" updated={UPDATED}>
      <p>
        Sanyuj is free for customers and providers. Businesses can optionally purchase custom
        sponsored ads shown in the app. Choose a document below.
      </p>
      <ul className="space-y-3">
        {LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-[18px] border border-line bg-white px-5 py-4 shadow-card transition hover:border-blue-deep/40"
            >
              <span className="font-display text-base font-extrabold text-ink">{item.title}</span>
              <span className="mt-1 block text-sm text-ink-soft">{item.body}</span>
            </Link>
          </li>
        ))}
      </ul>
    </LegalShell>
  );
}
