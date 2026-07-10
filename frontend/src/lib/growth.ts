const GROWTH_PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "percent",
  signDisplay: "exceptZero",
  maximumSignificantDigits: 3,
});

export function formatGrowthRate(rate: number | null): string {
  if (rate == null) return "—";
  if (!Number.isFinite(rate)) {
    throw new RangeError(`Growth rate must be finite, received ${rate}.`);
  }
  return GROWTH_PERCENT_FORMATTER.format(rate);
}

export function calculateRankingGrowthRate(
  start: number | null,
  end: number | null,
  minimumBaseline: number,
): number | null {
  if (start == null || end == null) return null;
  if (![start, end, minimumBaseline].every(Number.isFinite)) {
    throw new RangeError("Growth inputs must be finite numbers.");
  }
  if (minimumBaseline <= 0) {
    throw new RangeError("The minimum ranking baseline must be positive.");
  }

  const rankingStart = Math.max(start, minimumBaseline);
  return (end - rankingStart) / rankingStart;
}
