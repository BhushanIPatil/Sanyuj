import { ContactFormLink } from "@/components/ContactFormLink";
import { LegalShell, LegalSection } from "@/components/LegalShell";
export const metadata = { title: "Privacy Policy" };
export default function Page() {
  return <LegalShell title="Privacy Policy" updated="September 28, 2026">
    <p>Sanyuj provides offers and notifications without public accounts or profiles.</p>
    <LegalSection title="Information used by the app">
      <p>We do not ask for your name, phone number, address book, or a password to browse. Area filters select relevant content. If you choose location detection, your device asks for permission and the mobile app performs a lookup when you select Use my location; it is not saved to a customer profile. Coordinates are sent over HTTPS to our server and to OpenStreetMap Nominatim and Photon (Komoot) to resolve your address and area. Your area is used to find nearby notices and offers, including paid provider promotions. Mobile lookups do not run periodically or track you in the background.</p>
      <p>If you allow mobile push notifications, we register a delivery token, platform, app version, and registration timestamps. These are not linked to an account. We do not collect hardware identifiers or device names for push delivery.</p>
      <p>Our hosting and delivery services process network information such as IP addresses. Notification registration uses private, short-lived IP-based rate limits to prevent abuse. If you contact support, we receive the details you choose to send.</p>
    </LegalSection>
    <LegalSection title="Requests and follow-up">
      <p>When you submit a request, we store your name, phone number or email, image and any details you provide so our team can review it and follow up. Request images, contact details and internal follow-up notes are private to authorized administrators. A request is not published automatically. Submissions and support messages are collected through Google Forms, which processes them under Google?s privacy practices. Our team may transfer them to our administrator system in Supabase. Providers pay offline for publication; we record the agreed amount and payment status, but the app does not collect payment-card or bank credentials. Approved publication content, including any agreed image or contact details, becomes visible to viewers.</p>
    </LegalSection>
    <LegalSection title="Use and access">
      <p>We use this information to show content, deliver notifications, respond to support, and operate the service. Authorized administrators manage offers and notifications using separate admin accounts. Public clients cannot read notification tokens.</p>
      <p>Infrastructure services including Supabase, Firebase, and hosting services process information needed to operate these features. Offer links may open external sites with their own privacy practices.</p>
    </LegalSection>
    <LegalSection title="Your choices">
      <p>You can browse without granting location or notification permission, choose an area manually, and change permissions in your device settings. Use <ContactFormLink>our contact form</ContactFormLink> for privacy questions or a deletion request concerning support correspondence or published content, unpublished requests, request images, payment records or notification registration. Include enough information for us to locate your records; we may need to verify the request.</p>
    </LegalSection>
    <LegalSection title="Retention, deletion and security">
      <p>Request and support records are retained for review, follow-up and management of any agreed publication. Payment records may also need to be retained for accounting, disputes or applicable legal obligations. There is currently no automatic fixed-age deletion schedule for these records. You can request deletion through our contact form; we assess any records that must be retained and explain applicable exceptions.</p>
      <p>Push registrations are retained for notification delivery. Invalid delivery tokens are deactivated; deactivation does not itself erase the record. Location results in the mobile app are held in memory, while hosting and geocoding providers may retain network logs under their own retention policies. Backup and infrastructure-log expiry depends on the relevant provider configuration; deleting a live record does not immediately erase all backup copies.</p>
      <p>App service connections use HTTPS. Request records and delivery tokens are restricted to authorized administrative or server access. Access to Google Form responses must be limited to the team handling the request. We do not sell your personal information.</p>
    </LegalSection>
    <LegalSection title="Retired features">
      <p>The earlier account-based business listings, listing requests, customer accounts, and account-based click tracking have been retired. Their database records are removed as part of the retirement rollout. Historical backups and infrastructure logs follow their configured retention periods.</p>
    </LegalSection>
  </LegalShell>;
}
