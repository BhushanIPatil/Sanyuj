import { LegalShell, LegalSection } from "@/components/LegalShell";
export const metadata = { title: "Help & support" };
export default function Page() {
  return <LegalShell title="Help & support" updated="September 11, 2026">
    <p>Sanyuj brings together Offerly offers, local notifications and services. Browse them without creating an account.</p>
    <LegalSection title="Find offers and updates">
      <p>Open Offerly for promotions, or Notifications for announcements and events. Filter by category, date, pincode, locality, or area. Clear your filters to see more results.</p>
    </LegalSection>
    <LegalSection title="Notifications on your phone">
      <p>Allow notifications when prompted to receive updates. You can turn them off in your phone settings. The Notifications page remains available without push permission.</p>
    </LegalSection>
    <LegalSection title="Contact support">
      <p>For help, to report an inaccurate offer or announcement, or to discuss an offer placement, email <a href="mailto:support@sanyuj.app">support@sanyuj.app</a>. Include the content title or link. To discuss listing a service, include the provider name, service category, contact details and areas served. Administrators manage publication.</p>
    </LegalSection>
  </LegalShell>;
}
