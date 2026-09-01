export const JOB_STATUSES = ["open", "closed"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export function jobStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Open";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function jobStatusBadgeClass(status: string): string {
  switch (status) {
    case "open":
      return "bg-green-soft text-green-deep";
    case "closed":
      return "bg-surface text-ink-soft";
    default:
      return "bg-surface text-ink-soft";
  }
}

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
