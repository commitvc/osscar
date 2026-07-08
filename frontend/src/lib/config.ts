/** How many orgs per division are published to the frontend */
export const FRONTEND_TOP_N = 100;

/**
 * Absolute site origin, e.g. "https://osscar.dev". Used by server-side code
 * (email templates, share links) where relative URLs won't resolve.
 * Falls back so `npm run build` doesn't break without the env var.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://osscar.dev";
