import Link from "next/link";
import { ChevronRight, FileText, HelpCircle, Info, Mail, Shield } from "lucide-react";

const GROUPS = [
  { title: "Explore & connect", links: [
    { href: "/about", label: "About Sanyuj", description: "A little more about your local community app.", icon: Info },
    { href: "/contact", label: "Contact Us", description: "Send us a message. We would love to hear from you.", icon: Mail },
    { href: "/faq", label: "FAQs", description: "Answers about local offers, events and sharing.", icon: HelpCircle },
    { href: "/help", label: "Help & Support", description: "Find answers and help getting started.", icon: HelpCircle },
  ] },
  { title: "Privacy & terms", links: [
    { href: "/privacy", label: "Privacy Policy", description: "Understand how your information is handled.", icon: Shield },
    { href: "/terms", label: "Terms of Use", description: "Read the guidelines for using Sanyuj.", icon: FileText },
  ] },
];

export default function SanyujPage() {
  return <div className="page-pad mx-auto max-w-3xl">
    <header className="rounded-3xl border border-blue-deep/10 bg-gradient-to-br from-blue-soft via-white to-green-soft p-6 sm:p-8">
      <p className="text-sm font-bold text-blue-deep">Sanyuj</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">Your neighbourhood, connected.</h1>
      <p className="mt-3 text-sm leading-6 text-ink-soft">Get to know Sanyuj, find answers, or get in touch.</p>
    </header>
    {GROUPS.map(group => <section key={group.title} className="mt-7" aria-label={group.title}>
      <h2 className="mb-3 font-display text-lg font-bold">{group.title}</h2>
      <div className="space-y-3">
        {group.links.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-blue-deep/30 hover:shadow-card focus-visible:outline-2 focus-visible:outline-blue-deep sm:p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-soft text-blue-deep"><Icon size={23} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block font-display font-bold text-ink">{label}</span><span className="mt-1 block text-sm leading-5 text-ink-soft">{description}</span></span>
          <ChevronRight size={20} className="shrink-0 text-ink-soft group-hover:text-blue-deep" aria-hidden="true" />
        </Link>)}
      </div>
    </section>)}
  </div>;
}
