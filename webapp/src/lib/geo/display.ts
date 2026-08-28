export function locationLabel(opts: {
  locality?: string | null;
  pincode?: string | null;
  address?: string | null;
}): string {
  const loc = opts.locality?.trim() ?? "";
  const pin = opts.pincode?.trim() ?? "";
  const addr = opts.address?.trim() ?? "";

  if (loc && pin) return `${loc}, ${pin}`;
  if (loc) return loc;
  if (addr && pin && !addr.includes(pin)) return `${addr}, ${pin}`;
  if (addr) return addr;
  return pin || "—";
}
