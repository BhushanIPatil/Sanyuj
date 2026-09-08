import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Sanyuj — how we collect, use, and protect your data on our free local help marketplace.",
};

const UPDATED = "7 September 2026";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains how <strong className="text-ink">Sanyuj</strong> (“we”, “us”,
        “our”) collects, uses, shares, and protects information when you use our website, mobile
        app, and related services (the “Service”). It should be read with our{" "}
        <Link href="/terms" className="font-semibold text-blue-deep underline-offset-2 hover:underline">
          Terms of Use
        </Link>
        .
      </p>
      <p>
        Sanyuj is free for customers and providers. We do not sell your personal data. We monetize
        through custom sponsored ads that businesses pay us to display — not by charging users for
        core features.
      </p>

      <LegalSection title="1. Information we collect">
        <p>
          <strong className="text-ink">Account &amp; profile.</strong> Email address, password (stored
          via our auth provider), full name, optional or required phone number (especially for
          providers), and profile preferences.
        </p>
        <p>
          <strong className="text-ink">Location &amp; address.</strong> Pincode, locality, area,
          address text, and optionally approximate coordinates when you allow location access or
          enter an address. We use this to match nearby jobs, providers, and relevant ads.
        </p>
        <p>
          <strong className="text-ink">Business listing.</strong> Business name, category, phone,
          photo, coverage areas, and live/availability status if you list as a provider.
        </p>
        <p>
          <strong className="text-ink">Jobs &amp; interests.</strong> Job titles, descriptions,
          budgets/offers, urgency, and interest records between customers and providers.
        </p>
        <p>
          <strong className="text-ink">Devices &amp; notifications.</strong> Push notification tokens
          and basic device identifiers (for example device id, OS, device name) so we can send
          alerts you opt into.
        </p>
        <p>
          <strong className="text-ink">Usage related to ads.</strong> When you are signed in and tap a
          sponsored ad, we may record that click for reporting to us and to the advertiser in
          aggregate or account-linked form as needed to operate the ads product.
        </p>
        <p>
          <strong className="text-ink">Support.</strong> Messages you send to{" "}
          <a
            href="mailto:support@sanyuj.app"
            className="font-semibold text-blue-deep underline-offset-2 hover:underline"
          >
            support@sanyuj.app
          </a>{" "}
          or other contact addresses we publish.
        </p>
      </LegalSection>

      <LegalSection title="2. How we use information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Create and secure your account; restore or delete accounts when requested</li>
          <li>Show nearby providers, jobs, and service areas</li>
          <li>Enable interests, live status, and phone-based contact between consenting users</li>
          <li>Send transactional and product notifications you allow</li>
          <li>
            Display and measure custom sponsored ads, including geographic targeting so ads are
            relevant to a neighbourhood
          </li>
          <li>Prevent abuse, enforce our Terms, and improve reliability and UX</li>
          <li>Respond to support requests and legal obligations</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we share information">
        <p>We share information only as needed to run Sanyuj:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Other users.</strong> Your public listing or job details
            (such as name, area, category, job description) are visible to other users as part of
            the marketplace. Phone numbers are shared when a call/contact feature is used.
          </li>
          <li>
            <strong className="text-ink">Service providers.</strong> Infrastructure and tools such as
            database/auth hosting (e.g. Supabase), app hosting, SMS OTP delivery, push notification
            services (e.g. FCM), and geocoding/map APIs process data on our behalf.
          </li>
          <li>
            <strong className="text-ink">Advertisers.</strong> Businesses that buy sponsored
            placements may receive campaign performance information (for example impressions/clicks
            in a reporting form). We do not sell your profile as a marketing list.
          </li>
          <li>
            <strong className="text-ink">Legal &amp; safety.</strong> We may disclose information if
            required by law or to protect users, the Service, or rights from harm or fraud.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Ads and payments">
        <p>
          Core Sanyuj features are free. When a business pays us to show a custom ad, that commercial
          relationship is between Sanyuj and the advertiser. Payment details for ads are typically
          handled outside the app (for example by email/invoice), and we only collect what we need to
          set up and run the campaign.
        </p>
        <p>
          We do not process payments between customers and providers for jobs. Any payment for work
          is arranged directly by those parties.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies and similar technologies">
        <p>
          On the web, we use cookies or similar storage for authentication, guest browsing, and
          essential session features. We do not run third-party behavioural advertising networks
          inside Sanyuj for our sponsored home banners; those creatives are managed by us.
        </p>
      </LegalSection>

      <LegalSection title="6. Data retention">
        <p>
          We keep account and marketplace data while your account is active and as needed to provide
          the Service. If you delete your account, we soft-deactivate associated profile, business,
          job, interest, and device-token data so it is no longer used for normal product features.
          Residual copies may remain for a limited period in backups, logs, or where we must retain
          records for security, dispute, or legal reasons.
        </p>
      </LegalSection>

      <LegalSection title="7. Your choices">
        <ul className="list-disc space-y-2 pl-5">
          <li>Update profile, phone, and location details in the app</li>
          <li>Control device location permissions in your OS settings</li>
          <li>Disable push notifications in device or app settings where available</li>
          <li>Delete your account from Profile / account settings</li>
          <li>
            Email{" "}
            <a
              href="mailto:support@sanyuj.app"
              className="font-semibold text-blue-deep underline-offset-2 hover:underline"
            >
              support@sanyuj.app
            </a>{" "}
            for privacy questions or assistance accessing or correcting data
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use industry-standard practices (including encrypted transport and access controls via
          our providers) to protect data. No method of transmission or storage is 100% secure; please
          use a strong password and protect your devices.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>
          Sanyuj is not directed at children under 13 (or the minimum age required in your region).
          We do not knowingly collect personal information from children. If you believe a child has
          provided data, contact us and we will take appropriate steps.
        </p>
      </LegalSection>

      <LegalSection title="10. International processing">
        <p>
          We may process and store information on servers in India or other countries where our
          service providers operate. By using Sanyuj you understand that your information may be
          transferred to those locations with appropriate safeguards.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes">
        <p>
          We may update this Policy periodically. The “Last updated” date will change when we do.
          Material changes may also be highlighted in the app or by email when appropriate.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Privacy questions:{" "}
          <a
            href="mailto:support@sanyuj.app"
            className="font-semibold text-blue-deep underline-offset-2 hover:underline"
          >
            support@sanyuj.app
          </a>
          . General product help:{" "}
          <Link href="/help" className="font-semibold text-blue-deep underline-offset-2 hover:underline">
            Help &amp; Support
          </Link>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
