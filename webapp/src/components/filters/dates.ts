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

/** Match windows overlapping the selected local calendar dates, including both days. */
export function overlapsDateRange(start: string | null | undefined, end: string | null | undefined, range?: string): boolean {
  if (!range) return true;
  const [from, to] = range.split("|");
  const lower = from ? new Date(from + "T00:00:00").getTime() : -Infinity;
  const upperDate = to ? new Date(to + "T00:00:00") : null;
  if (upperDate) upperDate.setDate(upperDate.getDate() + 1);
  const upper = upperDate?.getTime() ?? Infinity;
  return (!start || new Date(start).getTime() < upper) && (!end || new Date(end).getTime() >= lower);
}

/** Local calendar dates avoid UTC shifts and daylight-saving arithmetic. */
export function dateRangePresets(now = new Date()) {
  const day = (offset: number) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  };
  return [
    { label: "Any time", value: "" },
    { label: "Today", value: day(0) + "|" + day(0) },
    { label: "Tomorrow", value: day(1) + "|" + day(1) },
    { label: "Next 7 days", value: day(0) + "|" + day(6) },
    { label: "Next 30 days", value: day(0) + "|" + day(29) },
  ];
}

export function dateRangeLabel(range?: string) {
  if (!range) return "Any time";
  const [from, to] = range.split("|");
  const format = (value: string) => new Date(value + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  if (from === to) return format(from);
  if (!from) return "Until " + format(to);
  if (!to) return "From " + format(from);
  return format(from) + " to " + format(to);
}
