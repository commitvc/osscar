import fs from "fs";
import path from "path";
import type { Org } from "@/types";
import { DATA_FILES } from "@/lib/config";

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

export function extractSlug(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.trim().replace(/\/$/, "").split("/").pop()?.toLowerCase() ?? null;
}

/** Find an org across both divisions by its GitHub URL slug. */
export function findOrgBySlug(slug: string): Org | undefined {
  const target = slug.toLowerCase();
  return getAllOrgs().find((o) => extractSlug(o.owner_url) === target);
}
