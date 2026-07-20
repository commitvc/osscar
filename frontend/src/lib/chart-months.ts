import type { TimeSeriesPoint } from "@/types";

const ISO_DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function assertIsoDate(date: string): void {
  const match = ISO_DATE_RE.exec(date);
  if (!match) {
    throw new Error(`Invalid chart date: ${date}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid chart date: ${date}`);
  }
}

export function getMonthlyTickDates(
  points: readonly Pick<TimeSeriesPoint, "date">[],
): string[] {
  const ticks: string[] = [];
  let previousMonth = "";

  for (const point of points) {
    assertIsoDate(point.date);
    const month = point.date.slice(0, 7);
    if (month === previousMonth) continue;

    ticks.push(point.date);
    previousMonth = month;
  }

  return ticks;
}

export function formatMonthTick(date: string): string {
  assertIsoDate(date);
  const monthIndex = Number(date.slice(5, 7)) - 1;
  return MONTH_LABELS[monthIndex]!;
}
