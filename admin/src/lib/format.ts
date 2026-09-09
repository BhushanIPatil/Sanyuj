export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMoney(amount: number | null | undefined) {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `₹${Math.round(amount).toLocaleString()}`;
}

export function locationLabel(pincode: string | null, locality: string | null, area?: string | null) {
  const place = [area, locality].filter((v) => v?.trim()).join(", ");
  if (place && pincode) return `${place}, ${pincode}`;
  if (place) return place;
  if (pincode) return pincode;
  return "—";
}

export function initials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
