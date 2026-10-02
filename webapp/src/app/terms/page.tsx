import { ContactFormLink } from "@/components/ContactFormLink";
import { LegalShell, LegalSection } from "@/components/LegalShell";
export const metadata = { title: "Terms of Use" };
export default function Page() {
  return <LegalShell title="Terms of Use" updated="September 28, 2026">
    <p>By using Sanyuj, you agree to these terms. The service lets you browse offers, announcements and events without a public account.</p>
    <LegalSection title="Free browsing and provider fees">
      <p>Viewing offers, notices, announcements and events on Sanyuj is free for end users. There is no viewer subscription or in-app purchase to access this content.</p>
      <p>Businesses, organizers and other providers pay for publishing their offers or notices. Provider publication fees are arranged and collected offline by the Sanyuj team; the app does not process payments. These fees are separate from any purchase a viewer makes from a provider.</p>
      <p>Before a provider agrees to a placement, its price, publication scope and duration, and any cancellation or refund conditions must be agreed with the Sanyuj team. Sending a request does not automatically publish content or create a payment obligation. Payment does not guarantee views, enquiries, sales or approval of content that violates our rules.</p>
    </LegalSection>
    <LegalSection title="Offers and announcements">
      <p>Content is published by our administrators. Offer availability, eligibility, prices, and validity depend on the terms displayed by the advertiser or organizer. Confirm details with the relevant advertiser before acting on an offer. A placement does not guarantee availability or endorse an external service.</p>
      <p>Links may take you to external websites, whose terms apply there.</p>
    </LegalSection>
    <LegalSection title="Responsible use">
      <p>Only submit content you are authorized to publish. Do not submit unlawful, fraudulent, discriminatory, sexually explicit, violent or misleading content, disclose another person?s private information without permission, or infringe intellectual-property rights. Do not misuse the service, attempt unauthorized access to admin tools, disrupt delivery, or distribute misleading content through support channels. We may remove inaccurate or inappropriate content and change or discontinue features.</p>
    </LegalSection>
    <LegalSection title="Support and privacy">
      <p>Report incorrect content or ask for help through <ContactFormLink>our contact form</ContactFormLink>. Our <a href="/privacy">Privacy Policy</a> explains how the app handles information.</p>
    </LegalSection>
  </LegalShell>;
}
