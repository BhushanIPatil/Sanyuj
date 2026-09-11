import { LegalShell, LegalSection } from "@/components/LegalShell";
export const metadata = { title: "Terms of Use" };
export default function Page() {
  return <LegalShell title="Terms of Use" updated="September 11, 2026">
    <p>By using Sanyuj, you agree to these terms. The service lets you browse offers, announcements, and events without a public account.</p>
    <LegalSection title="Offers and announcements">
      <p>Content is published by our administrators. Offer availability, eligibility, prices, and validity depend on the terms displayed by the advertiser or organizer. Confirm details with the relevant advertiser before acting on an offer. A placement does not guarantee availability or endorse an external service.</p>
      <p>Sanyuj does not operate a provider directory or arrange service bookings. Links may take you to external websites, whose terms apply there.</p>
    </LegalSection>
    <LegalSection title="Responsible use">
      <p>Do not misuse the service, attempt unauthorized access to admin tools, disrupt delivery, or distribute misleading content through support channels. We may remove inaccurate or inappropriate content and change or discontinue features.</p>
    </LegalSection>
    <LegalSection title="Support and privacy">
      <p>Report incorrect content or ask for help at <a href="mailto:support@sanyuj.app">support@sanyuj.app</a>. Our <a href="/privacy">Privacy Policy</a> explains how the app handles information.</p>
    </LegalSection>
  </LegalShell>;
}
