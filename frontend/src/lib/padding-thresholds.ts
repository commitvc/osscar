import type { Division } from "@/types"

export type MetricKey = "github_stars" | "github_contributors" | "package_downloads"

/**
 * Padding thresholds for low-baseline adjustment. Must stay in sync with
 * PADDING_THRESHOLDS_BY_DIVISION in methodology/compute_index.py.
 */
export const PADDING_THRESHOLDS: Record<MetricKey, Record<Division, number>> = {
  github_stars:        { emerging: 100,   scaling: 1_000 },
  github_contributors: { emerging: 1,     scaling: 5 },
  package_downloads:   { emerging: 1_000, scaling: 10_000 },
}

export function paddingThreshold(metric: MetricKey, division: Division): number {
  return PADDING_THRESHOLDS[metric][division]
}
