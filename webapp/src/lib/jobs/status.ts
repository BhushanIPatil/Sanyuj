export const JOB_STATUSES = ["open", "closed"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value);
}

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

/** Badge classes for status pills. */
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
