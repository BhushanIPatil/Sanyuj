/** Neighbour-facing event/offer window. Returns null when neither date is set. */
export function formatWhenRange(startIso: string | null | undefined, endIso: string | null | undefined): string | null {
  if (!startIso && !endIso) return null;
  const start = startIso ? new Date(startIso) : null;
  const end = endIso ? new Date(endIso) : null;
  if (start && Number.isNaN(start.getTime())) return null;
  if (end && Number.isNaN(end.getTime())) return null;

  const day = (d: Date) =>
    d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const time = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const midnight = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0;
  const sameDay =
    start &&
    end &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (start && end && sameDay) {
    const showStartTime = !midnight(start);
    const showEndTime = !midnight(end);
    if (!showStartTime && !showEndTime) return `on ${day(start)}`;
    if (showStartTime && showEndTime) {
      if (start.getHours() === end.getHours() && start.getMinutes() === end.getMinutes()) {
        return `on ${day(start)} at ${time(start)}`;
      }
      return `on ${day(start)} from ${time(start)} to ${time(end)}`;
    }
    if (showStartTime) return `on ${day(start)} from ${time(start)}`;
    return `on ${day(start)} until ${time(end)}`;
  }

  if (start && end) {
    const left = midnight(start) ? day(start) : `${day(start)}, ${time(start)}`;
    const right = midnight(end) ? day(end) : `${day(end)}, ${time(end)}`;
    return `${left} → ${right}`;
  }

  if (start) return midnight(start) ? `on ${day(start)}` : `on ${day(start)} from ${time(start)}`;
  if (end) return midnight(end) ? `until ${day(end)}` : `until ${day(end)}, ${time(end)}`;
  return null;
}
