export function locationLabel(opts: {
  area?: string | null;
  locality?: string | null;
  pincode?: string | null;
  address?: string | null;
}): string {
  const area = opts.area?.trim() ?? "";
  const loc = opts.locality?.trim() ?? "";
  const pin = opts.pincode?.trim() ?? "";
  const addr = opts.address?.trim() ?? "";

  const place = [area, loc].filter(Boolean).join(", ");
  if (place && pin) return `${place}, ${pin}`;
  if (place) return place;
  if (addr && pin && !addr.includes(pin)) return `${addr}, ${pin}`;
  if (addr) return addr;
  return pin || "—";
}
