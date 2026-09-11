import { LegalShell } from "@/components/LegalShell";
export const metadata = { title: "Policies & support" };
export default function Page() {
  return <LegalShell title="Policies & support" updated="September 11, 2026">
    <p>Read about the offers and notifications service.</p>
    <p>
      <a href="/privacy">Privacy Policy</a>
    </p>
    <p>
      <a href="/terms">Terms of Use</a>
    </p>
    <p>
      <a href="/help">Help & support</a>
    </p>
  </LegalShell>;
}
