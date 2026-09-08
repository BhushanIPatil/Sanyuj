import type { Metadata } from "next";
import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Help & Support",
  description:
    "Get help with Sanyuj — posting jobs, free business listings, sponsored ads, and account support.",
};

const UPDATED = "7 September 2026";

export default function HelpPage() {
  return (
    <LegalShell title="Help & Support" updated={UPDATED}>
      <p>
        Sanyuj connects neighbours who need help with people and small businesses nearby. The app is{" "}
        <strong className="text-ink">free to use</strong> for customers and providers. We only charge
        businesses that want to buy <strong className="text-ink">custom sponsored ads</strong> shown
        in the app.
      </p>

      <div className="rounded-[18px] border border-line bg-white p-5 shadow-card">
        <p className="text-sm font-bold text-ink">Contact us</p>
        <p className="mt-1 text-sm text-ink-soft">
          Email{" "}
          <a
            href="mailto:support@sanyuj.app"
            className="font-semibold text-blue-deep underline-offset-2 hover:underline"
          >
            support@sanyuj.app
          </a>
          . We usually reply within 1–2 business days.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          For sponsored home banners, use subject line{" "}
          <span className="font-semibold text-ink">“Banner ad on Sanyuj”</span> or write to the same
          address from the in-app ads section.
        </p>
      </div>

      <LegalSection title="Quick answers">
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-ink">Is Sanyuj free?</h3>
            <p className="mt-1">
              Yes. Creating an account, posting jobs, listing your business, browsing providers,
              expressing interest, and going live are free. We do not take a commission on jobs. Any
              payment for work is arranged directly between you and the other person.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">How do I post a job?</h3>
            <p className="mt-1">
              Sign in, open Post job (or My Jobs), describe what you need, set your area, and publish.
              Nearby providers can see the job and express interest. You may be limited to one new
              job post per day to keep the feed fair.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">How do I list my business?</h3>
            <p className="mt-1">
              From Profile or Home, set up your business with category, phone, and service coverage
              (pincode / locality / area). Listing is free. Open the Job Feed and Go Live when you
              want neighbours to find you quickly.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">I want to advertise on Sanyuj</h3>
            <p className="mt-1">
              We offer custom sponsored placements (such as home banners) targeted by area. Pricing
              and creatives are arranged with our team — there is no self-serve checkout in the app.
              Email{" "}
              <a
                href="mailto:support@sanyuj.app?subject=Banner%20ad%20on%20Sanyuj"
                className="font-semibold text-blue-deep underline-offset-2 hover:underline"
              >
                support@sanyuj.app
              </a>{" "}
              with your business name, area, and preferred dates.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">How do I delete my account?</h3>
            <p className="mt-1">
              Open Profile → Account settings → Delete account. This deactivates your profile and
              associated jobs/business data. You can also email support if you need help.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Guest browsing</h3>
            <p className="mt-1">
              You can browse nearby providers as a guest. Sign in when you want to post a job or manage
              a business listing.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Safety tips</h3>
            <p className="mt-1">
              Meet in public when possible, verify identity before large payments, and only share
              personal details you are comfortable disclosing. Report abuse or suspicious activity to
              support.
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="Policies">
        <p>
          Please read our{" "}
          <Link href="/terms" className="font-semibold text-blue-deep underline-offset-2 hover:underline">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-blue-deep underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
