import { LegalShell, LegalSection } from "@/components/LegalShell";
export const metadata = { title: "Privacy Policy" };
export default function Page() {
  return <LegalShell title="Privacy Policy" updated="September 11, 2026">
    <p>Sanyuj provides offers, notifications and admin-published services without public accounts or profiles.</p>
    <LegalSection title="Information used by the app">
      <p>We do not ask for your name, phone number, address book, or a password to browse. Area filters select relevant content. If you choose location detection, your device asks for permission and location is used to refresh your address and area while the app is active; it is not saved to a customer profile. Location lookup services receive the information needed to resolve your area.</p>
      <p>If you allow mobile push notifications, we register a delivery token, platform, app version, and registration timestamps. These are not linked to an account. We do not collect hardware identifiers or device names for push delivery.</p>
      <p>Our hosting and delivery services process network information such as IP addresses. Notification registration uses private, short-lived IP-based rate limits to prevent abuse. If you contact support, we receive the details you choose to send.</p>
    </LegalSection>
    <LegalSection title="Use and access">
      <p>We use this information to show content, deliver notifications, respond to support, and operate the service. Authorized administrators manage offers, notifications and service listings using separate admin accounts. Public clients cannot read notification tokens.</p>
      <p>Infrastructure services including Supabase, Firebase, and hosting services process information needed to operate these features. Offer links may open external sites with their own privacy practices.</p>
    </LegalSection>
    <LegalSection title="Your choices">
      <p>You can browse without granting location or notification permission, choose an area manually, and change permissions in your device settings. Contact <a href="mailto:support@sanyuj.app">support@sanyuj.app</a> for privacy questions or a deletion request concerning support correspondence or information published in content.</p>
    </LegalSection>
    <LegalSection title="Retired features">
      <p>The earlier account-based business listings, listing requests, customer accounts, and account-based click tracking have been retired. Current service listings are published separately by administrators. Their database records are removed as part of the retirement rollout. Historical backups and infrastructure logs follow their configured retention periods.</p>
    </LegalSection>
  </LegalShell>;
}
