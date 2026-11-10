// Dates from the API are plain "YYYY-MM-DD" text. We format them in UTC so a
// person in any time zone sees the same month.
const monthYearFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatMonthYear(dateOnly: string): string {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? dateOnly
    : monthYearFormatter.format(date);
}

// "Mar 2023 – Present"
export function formatDateRange(start: string, end: string | null): string {
  return `${formatMonthYear(start)} – ${end ? formatMonthYear(end) : "Present"}`;
}

// "2016 – 2020", or null when there is nothing to show.
export function formatYearRange(
  startYear: number | null,
  endYear: number | null,
): string | null {
  if (startYear !== null && endYear !== null) {
    return `${startYear} – ${endYear}`;
  }
  if (startYear !== null) {
    return `${startYear} – Present`;
  }
  if (endYear !== null) {
    return String(endYear);
  }
  return null;
}
