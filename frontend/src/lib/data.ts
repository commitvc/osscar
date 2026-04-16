import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type { OrgEntry, FrontendOrgData, RepoEntry, TimeSeriesPoint } from "@/types";
import { DATA_FILES } from "@/lib/config";

function parseCsv(filename: string): OrgEntry[] {
  const file = fs.readFileSync(
    path.join(process.cwd(), "data", filename),
    "utf-8"
  );
  const { data } = Papa.parse<OrgEntry>(file, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  return data;
}

export function getAbove1000(): OrgEntry[] {
  return parseCsv(DATA_FILES.above_1000);
}

export function getBelow1000(): OrgEntry[] {
  return parseCsv(DATA_FILES.below_1000);
}

type RawFrontendRow = Record<string, string>;

function safeParseJson<T>(str: string | null | undefined): T[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getFrontendData(): FrontendOrgData[] {
  const file = fs.readFileSync(
    path.join(process.cwd(), "data", DATA_FILES.frontend),
    "utf-8"
  );
  const { data } = Papa.parse<RawFrontendRow>(file, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  return data.map((row) => ({
    github_owner_id: row.github_owner_id ?? "",
    company_id: row.company_id ?? "",
    name: row.name ?? "",
    description: row.description || null,
    github_url: row.github_url ?? "",
    logo_url: row.logo_url || null,
    github_homepage_url: row.github_homepage_url || null,
    homepage_url: row.homepage_url || null,
    repositories: safeParseJson<RepoEntry>(row.repositories),
    github_stars_weekly: safeParseJson<TimeSeriesPoint>(row.github_stars_weekly),
    github_contributors_weekly: safeParseJson<TimeSeriesPoint>(
      row.github_contributors_weekly
    ),
    npm_weekly: safeParseJson<TimeSeriesPoint>(row.npm_weekly),
    pypi_weekly: safeParseJson<TimeSeriesPoint>(row.pypi_weekly),
    cargo_weekly: safeParseJson<TimeSeriesPoint>(row.cargo_weekly),
  }));
}

export function extractSlug(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.trim().replace(/\/$/, "").split("/").pop()?.toLowerCase() ?? null;
}
