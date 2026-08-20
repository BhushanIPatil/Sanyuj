export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

export function phoneToEmail(phone: string) {
  return `${phone.replace(/\D/g, "")}@users.sanyuj.app`;
}

export async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function displayPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) {
    return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  }
  return phone;
}

export const CATEGORIES = [
  { id: "plumber", label: "Plumber", emoji: "🔧" },
  { id: "electrician", label: "Electrician", emoji: "⚡" },
  { id: "auto_cab", label: "Auto & Cab", emoji: "🚗" },
  { id: "carpenter", label: "Carpenter", emoji: "🔨" },
  { id: "travels", label: "Travels", emoji: "🧳" },
  { id: "house_rent", label: "House Rent", emoji: "🏠" },
] as const;

export type ServiceCategory = (typeof CATEGORIES)[number]["id"];

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
