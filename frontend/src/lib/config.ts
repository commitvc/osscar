/**
 * Quarter configuration — update these values each quarter.
 *
 * This is the single source of truth for quarter-specific strings
 * used across the frontend. When publishing a new quarterly release:
 * 1. Update the values below
 * 2. Replace the CSV files in data/
 * 3. Rebuild and deploy
 */

/** Display label for the current quarter (e.g., "Q1 2026") */
export const QUARTER_LABEL = "Q1 2026";

/** Compact quarter identifier used in filenames (e.g., "Q12026") */
export const QUARTER_ID = "Q12026";

/** CSV filenames for each division */
export const DATA_FILES = {
  above_1000: `oss_growth_index_above_1000_${QUARTER_ID}_top200_clean.csv`,
  below_1000: `oss_growth_index_below_1000_${QUARTER_ID}_top200_clean.csv`,
  frontend: "oss_index_prototype_frontend_data.csv",
} as const;
