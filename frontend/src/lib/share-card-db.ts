import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { OrgCardData } from "@/app/api/og/render";

/**
 * Supabase-backed org lookup for share-card generation (the "long tail" path
 * at /api/og?login=…, used by the "Download your share card" CTA in the
 * score-report email).
 *
 * The site's share modal uses the frontend top-N JSON (see lib/data.ts), which
 * only covers the top 100 per division. Emails go out to every org in the
 * dataset — tens of thousands — so when a recipient clicks Download we have
 * to look up their org from the full `organizations_full` view instead.
 *
 * We select only the columns the renderer needs. `organizations_full` is a
 * view, not a table, so this is a read against materialized data — no heavy
 * joins at request time.
 */

export type ShareCardLookup = {
  card: OrgCardData;
  quarterLabel: string;
};

const QUARTER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate a UUIDv4-shaped string without pulling in a uuid dep. */
export function isQuarterId(value: string | null | undefined): value is string {
  return !!value && QUARTER_ID_RE.test(value);
}

type QuarterRow = { id: string; label: string };

async function getQuarter(quarterId: string | null): Promise<QuarterRow | null> {
  const query = getSupabaseAdmin().from("quarters").select("id, label").limit(1);
  const { data, error } = quarterId
    ? await query.eq("id", quarterId).maybeSingle()
    : await query.eq("is_current", true).maybeSingle();
  if (error || !data) return null;
  return data as QuarterRow;
}

type OrgRow = {
  owner_login: string;
  owner_name: string | null;
  owner_logo: string | null;
  division: "emerging" | "scaling";
  division_rank: number;
  github_stars_start: number | null;
  github_stars_end: number | null;
  github_contributors_start: number | null;
  github_contributors_end: number | null;
  package_downloads_start: number | null;
  package_downloads_end: number | null;
};

/**
 * Look up an org's share-card data by (GitHub login, quarter).
 *
 * `login` MUST be pre-validated against `normalizeLogin` — we assume the
 * GitHub-login format invariant and pass it straight to `.ilike()`.
 *
 * Returns `null` when the quarter doesn't exist, the org isn't in that
 * quarter's ranking, or the row is missing a display name.
 */
export async function getShareCardByLogin(
  login: string,
  quarterId: string | null,
): Promise<ShareCardLookup | null> {
  const quarter = await getQuarter(quarterId);
  if (!quarter) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("organizations_full")
    .select(
      "owner_login, owner_name, owner_logo, division, division_rank, github_stars_start, github_stars_end, github_contributors_start, github_contributors_end, package_downloads_start, package_downloads_end",
    )
    .eq("quarter_id", quarter.id)
    // GitHub logins are case-insensitive on lookup; `login` arrives lowercased.
    .ilike("owner_login", login)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as OrgRow;
  const name = row.owner_name?.trim() || row.owner_login;

  return {
    card: {
      owner_login: row.owner_login,
      owner_name: name,
      owner_logo: row.owner_logo,
      division: row.division,
      division_rank: row.division_rank,
      github_stars_start: row.github_stars_start,
      github_stars_end: row.github_stars_end,
      github_contributors_start: row.github_contributors_start,
      github_contributors_end: row.github_contributors_end,
      package_downloads_start: row.package_downloads_start,
      package_downloads_end: row.package_downloads_end,
    },
    quarterLabel: quarter.label,
  };
}
