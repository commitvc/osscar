import fs from "fs";
import path from "path";
import Papa from "papaparse";
import type { OrgEntry } from "@/types";

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
  return parseCsv("oss_growth_index_above_1000_Q42025_top200_clean.csv");
}

export function getBelow1000(): OrgEntry[] {
  return parseCsv("oss_growth_index_below_1000_Q42025_top200_clean.csv");
}
