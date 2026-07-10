const GROWTH_MULTIPLIER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 3,
});

const SMALL_GROWTH_MULTIPLIER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
});

export function formatGrowthMultiplier(rate: number | null): string {
  if (rate == null) return "—";
  if (!Number.isFinite(rate)) {
    throw new RangeError(`Growth rate must be finite, received ${rate}.`);
  }
  if (rate < -1) {
    throw new RangeError(`Growth rate cannot be less than -1, received ${rate}.`);
  }

  const multiplier = 1 + rate;
  const formatter =
    rate !== 0 && Math.abs(rate) < 0.01
      ? SMALL_GROWTH_MULTIPLIER_FORMATTER
      : GROWTH_MULTIPLIER_FORMATTER;
  return `${formatter.format(multiplier)}×`;
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
