/** Date predicates shared by the offer and notice filters. */

const DAY_MS = 24 * 60 * 60 * 1000;

export function isFuture(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() > Date.now();
}

/** True when `iso` falls between now and `days` from now. */
export function withinNextDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const at = new Date(iso).getTime();
  const now = Date.now();
  return at > now && at <= now + days * DAY_MS;
}

/** True when `iso` falls within the last `days`. */
export function withinPastDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const at = new Date(iso).getTime();
  const now = Date.now();
  return at <= now && at >= now - days * DAY_MS;
}

/** True while the window is open: started (or undated) and not finished. */
export function isRunningNow(startsAt: string | null, endsAt: string | null): boolean {
  const now = Date.now();
  if (startsAt && new Date(startsAt).getTime() > now) return false;
  if (endsAt && new Date(endsAt).getTime() <= now) return false;
  return true;
}
