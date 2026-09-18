import Link from "next/link";
import { ContactFormLink } from "@/components/ContactFormLink";
import { LegalShell, LegalSection } from "@/components/LegalShell";
export const metadata = { title: "Help & Support", description: "Get help with local offers, neighbourhood notifications and sharing updates on Sanyuj. Contact our team through the support form.", alternates: { canonical: "/help" } };
export default function Page() {
  return <LegalShell title="Help & Support" updated="September 18, 2026">
    <p>Sanyuj brings together Offerly offers and local notifications. Browse them without creating an account.</p>
    <LegalSection title="Find offers and updates">
      <p>Open Offerly for local promotions, or Notify for announcements and events. Filter by category, date, pincode, locality or area. Use quick date choices such as Today and Next 7 days, or select custom dates. Tap Apply in the mobile filter panel to return to your results.</p>
    </LegalSection>
    <LegalSection title="Notifications on your phone">
      <p>Allow notifications when prompted to receive updates. You can turn them off in your phone settings. The Notify page remains available without push permission.</p>
    </LegalSection>
    <LegalSection title="Share an offer or announcement">
      <p>Open <Link href="/app/requests">Share</Link>, select Offer or Notification and complete the Google Form. Our team will review your details and follow up before publication.</p>
    </LegalSection>
    <LegalSection title="Contact support">
      <p>For help, to report an inaccurate offer or announcement, or to discuss an offer placement, use our <ContactFormLink>Contact Us form</ContactFormLink>. Include the content title or link and the details of your question so our team can follow up.</p>
      <ContactFormLink className="inline-flex items-center rounded-xl bg-blue-deep px-5 py-3 font-bold !text-white !no-underline">Open contact form</ContactFormLink>
    </LegalSection>
    <LegalSection title="Frequently asked questions">
      <p>Find answers about offers near you, local events and community announcements in the <Link href="/faq">Sanyuj FAQs</Link>.</p>
    </LegalSection>
  </LegalShell>;
}
