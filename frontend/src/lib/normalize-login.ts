/**
 * Normalize a user-typed GitHub org reference into a lowercase login.
 *
 * Accepts:
 *   - "supabase"
 *   - "@supabase"
 *   - "supabase/"
 *   - "Supabase"
 *   - "https://github.com/supabase"
 *   - "https://github.com/supabase/supabase"   (org from a repo URL)
 *   - "github.com/supabase"
 *   - whitespace / trailing slashes anywhere
 *
 * Returns the lowercased login (e.g. "supabase") or `null` if the input
 * can't produce a syntactically valid GitHub login.
 *
 * Validation follows GitHub's documented rules:
 *   - 1–39 chars
 *   - alphanumeric + single hyphens
 *   - cannot start or end with a hyphen
 *
 * This runs both server-side (inside /api/request-score) and client-side
 * (the modal shows a live "we'll look up: <login>" hint), so must be pure
 * and isomorphic — no Node APIs.
 */

const GITHUB_LOGIN_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/;

export function normalizeLogin(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;

  // Strip leading "@"
  if (s.startsWith("@")) s = s.slice(1);

  // If it looks like a URL (with or without scheme), parse it.
  // Accept github.com/..., http(s)://github.com/..., or just a path.
  const urlMatch = s.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i,
  );
  if (urlMatch) {
    s = urlMatch[1];
  } else if (s.includes("/")) {
    // Things like "supabase/supabase" → take the first segment.
    s = s.split("/")[0];
  }

  // Trim whitespace/slashes one more time in case the URL had them.
  s = s.trim().replace(/^\/+|\/+$/g, "");
  if (!s) return null;

  const lower = s.toLowerCase();
  if (!GITHUB_LOGIN_RE.test(lower)) return null;
  return lower;
}
