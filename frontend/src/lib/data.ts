import "server-only";

import type { Division, Org, Quarter } from "@/types";
import { FRONTEND_TOP_N } from "@/lib/config";
import { normalizeLogin } from "@/lib/normalize-login";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const QUARTER_ID_RE = /^Q[1-4]_\d{4}$/;

const ORG_SELECT = [
  "owner_id",
  "owner_login",
  "owner_name",
  "owner_url",
  "homepage_url",
  "owner_description",
  "owner_logo",
  "division",
  "division_rank",
  "github_stars_start",
  "github_stars_end",
  "github_stars_growth_rate",
  "github_stars_growth_percentile",
  "github_stars_final_weight",
  "github_contributors_start",
  "github_contributors_end",
  "github_contributors_growth_rate",
  "github_contributors_growth_percentile",
  "github_contributors_final_weight",
  "package_downloads_start",
  "package_downloads_end",
  "package_downloads_growth_rate",
  "package_downloads_growth_percentile",
  "package_downloads_final_weight",
  "github_stars_weekly",
  "github_contributors_weekly",
  "npm_weekly",
  "pypi_weekly",
  "cargo_weekly",
  "repositories",
].join(", ");

type QuarterRow = {
  id: string;
  label: string;
  quarter_start: string;
  quarter_end: string;
  is_current: boolean;
  published_at: string;
};

type OrgRow = Omit<Org, "quarter_start" | "quarter_end">;

type RankingsByDivision = Record<Division, Org[]>;

type OrgQuarterRow = {
  quarter_id: string;
};

function isQuarterId(value: string | null | undefined): value is string {
  return !!value && QUARTER_ID_RE.test(value);
}

function assertArray<T>(value: T, field: keyof OrgRow, ownerLogin: string): T {
  if (!Array.isArray(value)) {
    throw new Error(
      `Invalid organizations_full payload for ${ownerLogin}: ${String(field)} is not an array.`,
    );
  }
  return value;
}

function mapQuarter(row: QuarterRow): Quarter {
  return {
    id: row.id,
    label: row.label,
    quarter_start: row.quarter_start,
    quarter_end: row.quarter_end,
    is_current: row.is_current,
    published_at: row.published_at,
  };
}

function mapOrg(row: OrgRow, quarter: Quarter): Org {
  return {
    ...row,
    owner_name: row.owner_name?.trim() || row.owner_login,
    quarter_start: quarter.quarter_start,
    quarter_end: quarter.quarter_end,
    github_stars_weekly: assertArray(
      row.github_stars_weekly,
      "github_stars_weekly",
      row.owner_login,
    ),
    github_contributors_weekly: assertArray(
      row.github_contributors_weekly,
      "github_contributors_weekly",
      row.owner_login,
    ),
    npm_weekly: assertArray(row.npm_weekly, "npm_weekly", row.owner_login),
    pypi_weekly: assertArray(row.pypi_weekly, "pypi_weekly", row.owner_login),
    cargo_weekly: assertArray(row.cargo_weekly, "cargo_weekly", row.owner_login),
    repositories: assertArray(row.repositories, "repositories", row.owner_login),
  };
}

export function extractSlug(url: string | null | undefined): string | null {
  return normalizeLogin(url);
}

export async function getPublishedQuarters(): Promise<Quarter[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("quarters")
    .select("id, label, quarter_start, quarter_end, is_current, published_at")
    .order("quarter_start", { ascending: false });

  if (error) {
    throw new Error(`Failed to load quarters: ${error.message}`);
  }

  return ((data ?? []) as QuarterRow[]).map(mapQuarter);
}

export async function getPublishedQuartersForOrg(
  slug: string,
  publishedQuarters?: Quarter[],
): Promise<Quarter[]> {
  const normalized = normalizeLogin(slug);
  if (!normalized) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("organizations_full")
    .select("quarter_id")
    .ilike("owner_login", normalized);

  if (error) {
    throw new Error(`Failed to load published quarters for ${normalized}: ${error.message}`);
  }

  const quarters = publishedQuarters ?? (await getPublishedQuarters());
  const quarterIds = new Set(
    ((data ?? []) as OrgQuarterRow[]).map((row) => row.quarter_id),
  );
  return quarters.filter((quarter) => quarterIds.has(quarter.id));
}

export async function getCurrentQuarter(): Promise<Quarter> {
  const { data, error } = await getSupabaseAdmin()
    .from("quarters")
    .select("id, label, quarter_start, quarter_end, is_current, published_at")
    .eq("is_current", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load current quarter: ${error.message}`);
  }
  if (!data) {
    throw new Error("No current OSSCAR quarter is configured.");
  }

  return mapQuarter(data as QuarterRow);
}

export async function getQuarterById(id: string): Promise<Quarter | null> {
  if (!isQuarterId(id)) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("quarters")
    .select("id, label, quarter_start, quarter_end, is_current, published_at")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load quarter ${id}: ${error.message}`);
  }

  return data ? mapQuarter(data as QuarterRow) : null;
}

export async function resolveQuarter(id: string | null | undefined): Promise<Quarter | null> {
  if (!id) return getCurrentQuarter();
  return getQuarterById(id);
}

async function getDivisionRankings(
  quarter: Quarter,
  division: Division,
): Promise<Org[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("organizations_full")
    .select(ORG_SELECT)
    .eq("quarter_id", quarter.id)
    .eq("division", division)
    .order("division_rank", { ascending: true })
    .order("owner_login", { ascending: true })
    .limit(FRONTEND_TOP_N);

  if (error) {
    throw new Error(
      `Failed to load ${division} rankings for ${quarter.id}: ${error.message}`,
    );
  }

  return ((data ?? []) as unknown as OrgRow[]).map((row) => mapOrg(row, quarter));
}

export async function getRankingsForQuarter(
  quarter: Quarter,
): Promise<RankingsByDivision> {
  const [emerging, scaling] = await Promise.all([
    getDivisionRankings(quarter, "emerging"),
    getDivisionRankings(quarter, "scaling"),
  ]);

  return { emerging, scaling };
}

export async function findOrgBySlugForQuarter(
  slug: string,
  quarter: Quarter,
): Promise<Org | null> {
  const normalized = normalizeLogin(slug);
  if (!normalized) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("organizations_full")
    .select(ORG_SELECT)
    .eq("quarter_id", quarter.id)
    .ilike("owner_login", normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load ${normalized} for ${quarter.id}: ${error.message}`,
    );
  }

  return data ? mapOrg(data as unknown as OrgRow, quarter) : null;
}
