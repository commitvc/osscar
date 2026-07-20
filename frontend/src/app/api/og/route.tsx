import { NextRequest } from "next/server";
import { findOrgBySlugForQuarter, resolveQuarter } from "@/lib/data";
import { normalizeLogin } from "@/lib/normalize-login";
import {
  getShareCardByLogin,
  isQuarterId,
} from "@/lib/share-card-db";
import { renderShareCard, type OrgCardData } from "./render";

/**
 * GET /api/og
 *
 * Renders the 1200×630 social share card. Two data-source paths:
 *
 *   ?slug=<login>[&quarter=<id>]  — site share modal & Open Graph meta.
 *                                    Reads from Supabase for the selected
 *                                    published quarter. Returns 404 when the
 *                                    org is outside that quarter's ranking.
 *
 *   ?login=<login>[&quarter=<id>] — email "Download your share card" CTA.
 *                                    Reads from Supabase `organizations_full`,
 *                                    which covers every org we rank (tens of
 *                                    thousands). Defaults `quarter` to the
 *                                    current quarter.
 *
 * Optional `&download=1` adds `Content-Disposition: attachment` with a safe
 * filename so clicking the email button triggers a browser download.
 *
 * Both paths produce byte-identical PNGs for the same (org, quarter). Cache
 * headers are applied at the framework level via next.config.ts (`embedImageOverrides`)
 * so they survive across both the site and the email entry points.
 */

export const runtime = "nodejs";

function bad(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function buildFilename(login: string, quarterLabel: string): string {
  // login is guaranteed GitHub-login format (normalizeLogin); quarterLabel
  // comes from config or our own DB. Still, conservatively strip anything
  // that isn't alphanumeric / dash / dot to defeat any header injection.
  const safeLogin = login.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const safeQuarter = quarterLabel
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `osscar-${safeLogin || "org"}-${safeQuarter || "current"}.png`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slugParam = searchParams.get("slug");
  const loginParam = searchParams.get("login");
  const quarterParam = searchParams.get("quarter");
  const wantsDownload = searchParams.get("download") === "1";

  // Exactly one data-source selector required. If a caller passes both, we
  // prefer `slug` (site path) for backwards-compatibility with existing
  // OpenGraph meta tags.
  if (!slugParam && !loginParam) {
    return bad(400, "Missing ?slug or ?login");
  }

  let card: OrgCardData | null = null;
  let quarterLabel: string | null = null;

  if (slugParam) {
    const normalized = normalizeLogin(slugParam);
    if (!normalized) return bad(400, "Invalid slug");
    const quarter = await resolveQuarter(quarterParam);
    if (!quarter) {
      return quarterParam ? bad(400, "Invalid quarter") : bad(500, "No current quarter");
    }
    const org = await findOrgBySlugForQuarter(normalized, quarter);
    if (!org) return new Response("Not found", { status: 404 });
    quarterLabel = quarter.label;
    card = {
      owner_login: org.owner_login,
      owner_name: org.owner_name,
      owner_logo: org.owner_logo,
      division: org.division,
      division_rank: org.division_rank,
      github_stars_start: org.github_stars_start,
      github_stars_end: org.github_stars_end,
      github_contributors_start: org.github_contributors_start,
      github_contributors_end: org.github_contributors_end,
      package_downloads_start: org.package_downloads_start,
      package_downloads_end: org.package_downloads_end,
    };
  } else {
    const normalized = normalizeLogin(loginParam);
    if (!normalized) return bad(400, "Invalid login");
    // Quarter is optional, but if supplied it must match our quarter-id
    // format — reject anything else before it touches the DB.
    if (quarterParam != null && !isQuarterId(quarterParam)) {
      return bad(400, "Invalid quarter");
    }
    const result = await getShareCardByLogin(normalized, quarterParam);
    if (!result) return new Response("Not found", { status: 404 });
    card = result.card;
    quarterLabel = result.quarterLabel;
  }

  if (!card || !quarterLabel) {
    return bad(500, "Share card could not be built");
  }

  const headers: Record<string, string> = {};
  if (wantsDownload) {
    const filename = buildFilename(card.owner_login, quarterLabel);
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }

  return renderShareCard(card, { quarterLabel, headers });
}
