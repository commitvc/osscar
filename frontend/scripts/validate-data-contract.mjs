import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(scriptDir, "..");
const configPath = join(frontendDir, "src/lib/config.ts");
const dataDir = join(frontendDir, "data");

const config = readFileSync(configPath, "utf8");
const topNMatch = config.match(/export const FRONTEND_TOP_N\s*=\s*(\d+)/);
if (!topNMatch) {
  throw new Error("Could not read FRONTEND_TOP_N from frontend/src/lib/config.ts");
}

const topN = Number(topNMatch[1]);
const expectedDivisions = new Set(["emerging", "scaling"]);

const requiredFields = [
  "owner_id",
  "owner_login",
  "owner_name",
  "owner_url",
  "homepage_url",
  "owner_description",
  "owner_logo",
  "quarter_start",
  "quarter_end",
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
];

const arrayFields = [
  "github_stars_weekly",
  "github_contributors_weekly",
  "npm_weekly",
  "pypi_weekly",
  "cargo_weekly",
  "repositories",
];

const files = readdirSync(dataDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

let failures = 0;
const seenDivisions = new Set();

function displayPath(path) {
  return relative(join(frontendDir, ".."), path);
}

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

console.log(`FRONTEND_TOP_N=${topN}`);
console.log(`Checking ${files.length} data files...`);

if (files.length === 0) {
  fail("No frontend/data/*.json files found");
}

for (const file of files) {
  const fullPath = join(dataDir, file);
  const fileLabel = displayPath(fullPath);
  const filenameMatch = file.match(/^osscar_(emerging|scaling)_top(\d+)_.+\.json$/);

  if (!filenameMatch) {
    fail(`${fileLabel}: filename does not match osscar_<division>_top<N>_<quarter>.json`);
    continue;
  }

  const expectedDivision = filenameMatch[1];
  const filenameTopN = Number(filenameMatch[2]);
  seenDivisions.add(expectedDivision);

  if (filenameTopN !== topN) {
    fail(`${fileLabel}: filename top${filenameTopN} does not match FRONTEND_TOP_N=${topN}`);
  }

  let records;
  try {
    records = JSON.parse(readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`${fileLabel}: JSON parse failed: ${error.message}`);
    continue;
  }

  if (!Array.isArray(records)) {
    fail(`${fileLabel}: top-level JSON value is not an array`);
    continue;
  }

  if (records.length !== topN) {
    fail(`${fileLabel}: expected ${topN} rows, got ${records.length}`);
  }

  const ranks = [];
  records.forEach((record, index) => {
    const rowLabel = `${fileLabel}[${index}]`;

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(record, field)) {
        fail(`${rowLabel}: missing required field ${field}`);
      }
    }

    for (const field of arrayFields) {
      if (Object.prototype.hasOwnProperty.call(record, field) && !Array.isArray(record[field])) {
        fail(`${rowLabel}: expected ${field} to be an array`);
      }
    }

    if (record.division !== expectedDivision) {
      fail(`${rowLabel}: expected division ${expectedDivision}, got ${record.division}`);
    }

    if (!Number.isInteger(record.division_rank)) {
      fail(`${rowLabel}: division_rank is not an integer: ${record.division_rank}`);
    } else {
      ranks.push(record.division_rank);
    }
  });

  const sortedRanks = [...ranks].sort((a, b) => a - b);
  for (let i = 0; i < topN; i += 1) {
    if (sortedRanks[i] !== i + 1) {
      fail(`${fileLabel}: ranks are not exactly 1..${topN}; got ${sortedRanks.join(",")}`);
      break;
    }
  }

  console.log(`OK ${file}: ${records.length} ${expectedDivision} rows, ranks 1..${topN}`);
}

for (const division of expectedDivisions) {
  if (!seenDivisions.has(division)) {
    fail(`Missing data file for division ${division}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} data contract failure(s)`);
  process.exit(1);
}

console.log("\nData contract passed.");
