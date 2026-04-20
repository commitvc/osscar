/**
 * Quarter configuration — update these values each quarter.
 *
 * This is the single source of truth for quarter-specific strings
 * used across the frontend. When publishing a new quarterly release:
 * 1. Update the values below
 * 2. Re-run `python methodology/extract_frontend_data.py` to regenerate
 *    the per-division JSON files in `frontend/data/`
 * 3. Rebuild and deploy
 */

/** Display label for the current quarter (e.g., "Q1 2026") */
export const QUARTER_LABEL = "Q1 2026";

/** Compact quarter identifier used in data filenames (e.g., "Q1_2026") */
export const QUARTER_ID = "Q1_2026";

/** How many orgs per division are published to the frontend */
export const FRONTEND_TOP_N = 100;

/** JSON filenames for each division — produced by methodology/extract_frontend_data.py */
export const DATA_FILES = {
  emerging: `osscar_emerging_top${FRONTEND_TOP_N}_${QUARTER_ID}.json`,
  scaling: `osscar_scaling_top${FRONTEND_TOP_N}_${QUARTER_ID}.json`,
} as const;
