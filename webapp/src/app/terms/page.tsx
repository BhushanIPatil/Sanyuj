import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms of Use for Sanyuj — the free local help marketplace. Learn about accounts, listings, and sponsored ads.",
};

const UPDATED = "7 September 2026";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use" updated={UPDATED}>
      <p>
        Welcome to <strong className="text-ink">Sanyuj</strong> (“we”, “us”, “our”). These Terms of
        Use (“Terms”) govern your use of the Sanyuj website, mobile app, and related services
        (together, the “Service”). By creating an account, browsing as a guest, or using Sanyuj,
        you agree to these Terms and our{" "}
        <Link href="/privacy" className="font-semibold text-blue-deep underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <LegalSection title="1. What Sanyuj is">
        <p>
          Sanyuj is a hyperlocal marketplace that helps neighbours find local help and helps
          skilled people and small businesses get found nearby. You can browse providers, go live
          when available, and call other users when they choose to share contact details.
        </p>
        <p>
          Sanyuj is a discovery and connection platform. We are not an employer, employment agency,
          escrow service, or payment processor for work arranged between users.
        </p>
      </LegalSection>

      <LegalSection title="2. Free to use — no platform fees">
        <p>
          <strong className="text-ink">Sanyuj does not charge users</strong> to create an account,
          browse the Service, list a business, go live, or contact other users through the features
          we provide.
        </p>
        <p>
          Any budget, offer, or payment for work is agreed directly between the customer and the
          provider. Sanyuj does not take a commission, process payments for work, or hold funds for those
          arrangements.
        </p>
      </LegalSection>

      <LegalSection title="3. Sponsored ads (how we monetize)">
        <p>
          Our only in-app monetization today is <strong className="text-ink">custom sponsored
          ads</strong> (for example, home banner placements) shown to users in relevant areas.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Businesses that want to advertise on Sanyuj can contact us (see{" "}
            <Link href="/help" className="font-semibold text-blue-deep underline-offset-2 hover:underline">
              Help &amp; Support
            </Link>
            ). Ad placement, creative, targeting, duration, and fees are arranged with us —
            typically offline — and then configured by our team.
          </li>
          <li>
            There is no self-serve ad checkout inside the app. Ordinary users and free business
            listings are not charged for ads.
          </li>
          <li>
            Sponsored ads are separate from free business listings. Showing an ad does
            not mean we endorse the advertiser’s products or services.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Accounts and eligibility">
        <p>
          You must provide accurate registration details and keep them up to date. One person should
          use one account. You are responsible for activity under your account and for keeping login
          credentials secure.
        </p>
        <p>
          You may browse limited content as a guest. Features such as managing a
          business listing require a signed-in account. Providers may need a phone number and
          business details to list and appear nearby.
        </p>
        <p>
          If you are under the age where you can form a binding contract in your jurisdiction, you
          may only use Sanyuj with a parent or guardian’s involvement as required by law.
        </p>
      </LegalSection>

      <LegalSection title="5. Listings and user interactions">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Business profiles, live status, and contact details are created by users.
            You are responsible for the accuracy and legality of content you submit.
          </li>
          <li>
            Location (such as pincode, locality, and area) is used to show relevant providers
            and ads. Provide a real service area so neighbours get useful matches.
          </li>
          <li>
            When you call or share a phone number, you choose to disclose that contact information to
            another user. Use caution and local common sense.
          </li>
          <li>
            We may apply reasonable limits to keep the Service fair and reliable.
          </li>
          <li>
            Sanyuj does not guarantee that a provider will be available or that any work
            will meet your expectations. Vet people before engaging them.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Post illegal, fraudulent, harassing, hateful, or misleading content</li>
          <li>Impersonate others or misrepresent your skills, business, or location</li>
          <li>Spam, scrape, reverse-engineer, or disrupt the Service</li>
          <li>Use Sanyuj to solicit payments for work you do not intend to perform</li>
          <li>Upload malware or attempt unauthorized access to accounts or systems</li>
          <li>Use the Service in any way that violates applicable law</li>
        </ul>
        <p>
          We may remove content, suspend features, or deactivate accounts that violate these Terms
          or harm other users.
        </p>
      </LegalSection>

      <LegalSection title="7. Intellectual property">
        <p>
          Sanyuj’s name, branding, design, and software remain our property (or our licensors’). You
          keep ownership of content you post, and you grant us a non-exclusive licence to host,
          display, and distribute that content as needed to operate and improve the Service
          (including showing your listing to nearby users).
        </p>
      </LegalSection>

      <LegalSection title="8. Third-party services">
        <p>
          The Service relies on third parties such as hosting, authentication, maps/geocoding, SMS
          delivery, and push notifications. Their availability and terms may affect your experience.
          Links or ads for third-party businesses do not mean we control those businesses.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers">
        <p>
          The Service is provided “as is” and “as available.” To the fullest extent permitted by law,
          we disclaim warranties of merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant uninterrupted or error-free operation.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the fullest extent permitted by law, Sanyuj and its operators will not be liable for
          indirect, incidental, special, consequential, or punitive damages, or for lost profits,
          data, or goodwill, arising from your use of the Service or from interactions with other
          users. Our total liability for any claim relating to the Service is limited to the greater
          of (a) the amount you paid us for sponsored ads in the three months before the claim, or
          (b) INR 1,000 — reflecting that the core Service is free for users.
        </p>
      </LegalSection>

      <LegalSection title="11. Account deletion and termination">
        <p>
          You may delete your account from the Profile / account settings in the app or website. We
          also may suspend or terminate access for Terms violations or to protect the Service. After
          deletion, some records may be retained as described in our Privacy Policy (for example,
          for security, legal, or backup purposes).
        </p>
      </LegalSection>

      <LegalSection title="12. Changes">
        <p>
          We may update these Terms from time to time. The “Last updated” date above will change when
          we do. Continued use after changes means you accept the updated Terms. If you disagree,
          stop using the Service and delete your account.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          Questions about these Terms:{" "}
          <a
            href="mailto:support@sanyuj.app"
            className="font-semibold text-blue-deep underline-offset-2 hover:underline"
          >
            support@sanyuj.app
          </a>
          . More help is on our{" "}
          <Link href="/help" className="font-semibold text-blue-deep underline-offset-2 hover:underline">
            Help &amp; Support
          </Link>{" "}
          page.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
