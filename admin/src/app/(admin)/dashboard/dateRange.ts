export type Period = "today" | "week" | "month" | "year" | "custom";

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value ? date : null;
}

// Local calendar boundaries; the exclusive end includes the entire last day.
export function dateRange(period: Period, from: string, to: string, now = new Date()) {
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end = new Date(start);
  if (period === "custom") {
    const first = parseDate(from);
    const last = parseDate(to);
    if (!first || !last || first > last) return null;
    start = first;
    end = last;
    end.setDate(end.getDate() + 1);
  } else if (period === "week") {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else if (period === "month") {
    start.setDate(1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  } else if (period === "year") {
    start = new Date(start.getFullYear(), 0, 1);
    end = new Date(start.getFullYear() + 1, 0, 1);
  } else {
    end.setDate(end.getDate() + 1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}
