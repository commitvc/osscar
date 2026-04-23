import fs from "fs";
import path from "path";
import type { Org } from "@/types";
import { DATA_FILES } from "@/lib/config";
import { normalizeLogin } from "@/lib/normalize-login";

function readOrgs(filename: string): Org[] {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "data", filename),
    "utf-8"
  );
  return JSON.parse(raw) as Org[];
}

export function getEmerging(): Org[] {
  return readOrgs(DATA_FILES.emerging);
}

export function getScaling(): Org[] {
  return readOrgs(DATA_FILES.scaling);
}

/** Combined list across both divisions — useful for slug lookup. */
export function getAllOrgs(): Org[] {
  return [...getEmerging(), ...getScaling()];
}

/**
 * Derive the canonical org slug (= GitHub login, lowercased) from any of the
 * representations we store in CSV rows: full URL, "owner/repo", bare login.
 *
 * Thin wrapper over `normalizeLogin` so client + server share one parser.
 */
export function extractSlug(url: string | null | undefined): string | null {
  return normalizeLogin(url);
}

/** Find an org across both divisions by its GitHub URL slug. */
export function findOrgBySlug(slug: string): Org | undefined {
  const target = slug.toLowerCase();
  return getAllOrgs().find((o) => extractSlug(o.owner_url) === target);
}
