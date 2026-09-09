export function accountStatusBadge(active: boolean, deleted: boolean): string {
  if (deleted) return "bg-rose-soft text-rose";
  if (!active) return "bg-amber-soft text-amber";
  return "bg-green-soft text-green-deep";
}

export function accountStatusLabel(active: boolean, deleted: boolean): string {
  if (deleted) return "Deleted";
  if (!active) return "Inactive";
  return "Active";
}
