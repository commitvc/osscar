#!/usr/bin/env node
/* eslint-disable */
/**
 * Generate per-company asset packs for each org in the top 100 of each division.
 *
 *   generated/<division>/<owner_login>/
 *     share.png                         (always)
 *     badge-default.svg                 (always)
 *     badge-light.svg                   (always)
 *     top-<10|25>-<division>-featured.html   (rank ≤ 25 only)
 *     top-<10|25>-<division>-featured.png    (rank ≤ 25 only)
 *
 * Prereqs: dev server running on http://localhost:57008.
 *
 * Usage:
 *   node frontend/scripts/generate-assets.mjs                        # full run
 *   node frontend/scripts/generate-assets.mjs --test <owner_login>   # single company
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Paths / config ─────────────────────────────────────────────────────────
const FRONTEND = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(FRONTEND, "..");
const DATA_DIR = path.join(FRONTEND, "data");
const PUBLIC_DIR = path.join(FRONTEND, "public");
const TEMPLATE_DIR = "/Users/abel/Desktop/osscar/project";
const OUT_ROOT = path.join(REPO_ROOT, "generated");
const DEV_SERVER = process.env.DEV_SERVER ?? "http://localhost:57008";
const QUARTER_LABEL = "Q1 2026";

// ─── CLI flags ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const testIdx = args.indexOf("--test");
const TEST_LOGIN = testIdx >= 0 ? args[testIdx + 1] : null;
const SHARES_ONLY = args.includes("--shares-only");

// ─── Assets + fonts ─────────────────────────────────────────────────────────
const INTER_BOLD = fs.readFileSync(
  path.join(FRONTEND, "src/app/api/og/Inter-Bold.ttf")
);

function readPublicDataUri(filename, mime) {
  const buf = fs.readFileSync(path.join(PUBLIC_DIR, filename));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

const ASSETS = {
  osscarIcon: readPublicDataUri("osscar-icon.png", "image/png"),
  supabaseDark: readPublicDataUri("brand-supabase.png", "image/png"), // white-on-dark wordmark
  supabaseLight: readPublicDataUri("brand-supabase-dark.png", "image/png"),
  rrw: readPublicDataUri("brand-rrw.png", "image/png"),
};

// ─── Data ───────────────────────────────────────────────────────────────────
/** @typedef {ReturnType<typeof JSON.parse>} Org */

const emerging = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "osscar_emerging_top100_Q1_2026.json"), "utf-8")
);
const scaling = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "osscar_scaling_top100_Q1_2026.json"), "utf-8")
);

const ORG_BY_LOGIN = new Map();
[...emerging, ...scaling].forEach((o) => ORG_BY_LOGIN.set(o.owner_login, o));

// ─── Utilities ──────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugFromUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim().replace(/\/$/, "");
  return trimmed.split("/").pop()?.toLowerCase() ?? null;
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, contentType: res.headers.get("content-type") ?? "image/png" };
}

async function fetchDataUri(url) {
  try {
    const { buf, contentType } = await fetchBuffer(url);
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// ─── Satori helper (mini hyperscript) ───────────────────────────────────────
function h(type, props, ...children) {
  const flat = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: { ...(props || {}), children: flat.length <= 1 ? flat[0] : flat },
    key: null,
  };
}

// ─── Badge rank palette (mirrors src/app/api/badge/route.tsx) ───────────────
function rankPalette(rank, light) {
  if (rank === 1)
    return {
      kind: "hash", label: String(rank),
      rankColor: light ? "#c48a08" : "#f1d579",
      hashColor: light ? "#9a6a00" : "#eab308",
      tierColor: light ? "#a77b0a" : "#f1d579",
    };
  if (rank === 2)
    return {
      kind: "hash", label: String(rank),
      rankColor: light ? "#707070" : "#d7d7d7",
      hashColor: light ? "#a0a0a0" : "#9a9a9a",
      tierColor: light ? "#707070" : "#b4b4b4",
    };
  if (rank === 3)
    return {
      kind: "hash", label: String(rank),
      rankColor: light ? "#8a5321" : "#cd7f32",
      hashColor: light ? "#b07843" : "#8a5321",
      tierColor: light ? "#8a5321" : "#a8672a",
    };
  if (rank <= 10)
    return {
      kind: "hash", label: String(rank),
      rankColor: light ? "#111111" : "#ffffff",
      hashColor: light ? "#888888" : "#a0a0a0",
      tierColor: light ? "#555555" : "#dcdcdc",
    };
  if (rank <= 25)
    return {
      kind: "top", label: "25",
      rankColor: light ? "#111111" : "#ffffff",
      hashColor: light ? "#666666" : "#9a9a9a",
      tierColor: light ? "#555555" : "#dcdcdc",
    };
  if (rank <= 50)
    return {
      kind: "top", label: "50",
      rankColor: light ? "#333333" : "#d0d0d0",
      hashColor: light ? "#777777" : "#8a8a8a",
      tierColor: light ? "#555555" : "#dcdcdc",
    };
  return {
    kind: "top", label: "100",
    rankColor: light ? "#555555" : "#aeaeae",
    hashColor: light ? "#888888" : "#6f6f6f",
    tierColor: light ? "#555555" : "#dcdcdc",
  };
}

// ─── Badge SVG (default 360×100, default + light) ───────────────────────────
async function renderBadgeSvg({ org, variant, orgLogoDataUri }) {
  const light = variant === "light";
  const palette = rankPalette(org.division_rank, light);
  const tierLabel = org.division === "scaling" ? "Scaling" : "Emerging";

  const bg = light ? "#ffffff" : "#141414";
  const bgEnd = light ? "#fafafa" : "#1a1a1a";
  const borderColor = light ? "#e6e6e6" : "#2a2a2a";
  const ink = light ? "#111111" : "#ededed";
  const inkMute = light ? "#888888" : "#6f6f6f";
  const dividerColor = light ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.12)";
  const supabaseImg = light ? ASSETS.supabaseLight : ASSETS.supabaseDark;

  const rankBlock = palette.kind === "hash"
    ? h("div", { style: { display: "flex", alignItems: "baseline" } },
        h("span", {
          style: {
            fontSize: 21, color: palette.hashColor, fontWeight: 500,
            marginRight: 2, display: "flex", lineHeight: 1,
          },
        }, "#"),
        h("span", {
          style: {
            fontSize: 34, fontWeight: 800, letterSpacing: "-0.04em",
            color: palette.rankColor, lineHeight: 1, display: "flex",
          },
        }, palette.label),
      )
    : h("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
        h("span", {
          style: {
            fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
            color: palette.hashColor, fontWeight: 700, display: "flex", lineHeight: 1,
          },
        }, "TOP"),
        h("span", {
          style: {
            fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em",
            color: palette.rankColor, lineHeight: 1, display: "flex",
          },
        }, palette.label),
      );

  const tree = h("div", {
    style: {
      display: "flex", width: 360, height: 100,
      background: `linear-gradient(180deg, ${bg} 0%, ${bgEnd} 100%)`,
      border: `1px solid ${borderColor}`,
      borderRadius: 12, overflow: "hidden",
      fontFamily: "Inter, sans-serif", color: ink,
    },
  },
    // accent bar
    h("div", {
      style: {
        width: 4, flexShrink: 0, display: "flex",
        background: "linear-gradient(180deg, #3ECF8E 0%, #2a9f6e 100%)",
      },
    }),
    // main column
    h("div", {
      style: {
        flex: 1, padding: "14px 18px 14px 16px",
        display: "flex", flexDirection: "column", justifyContent: "center",
        gap: 6, minWidth: 0,
      },
    },
      // row 1: logo + FEATURED ON
      h("div", {
        style: {
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase",
          color: inkMute, fontWeight: 600, lineHeight: 1,
        },
      },
        orgLogoDataUri
          ? h("img", {
              src: orgLogoDataUri,
              style: { width: 16, height: 16, borderRadius: 4, objectFit: "cover", display: "flex" },
            })
          : null,
        h("span", { style: { display: "flex" } }, "Featured on"),
      ),
      // wordmark
      h("span", {
        style: {
          fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em",
          color: ink, lineHeight: 1, marginTop: 1, display: "flex",
        },
      }, "OSSCAR"),
      // by row
      h("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 2 } },
        h("span", {
          style: {
            letterSpacing: "0.18em", textTransform: "uppercase",
            fontSize: 9, color: inkMute, fontWeight: 600, display: "flex",
          },
        }, "by"),
        h("img", { src: supabaseImg, style: { height: 13, display: "flex" } }),
        h("span", { style: { color: inkMute, fontSize: 10, display: "flex" } }, "×"),
        h("div", { style: { display: "flex", alignItems: "center", gap: 5 } },
          h("img", { src: ASSETS.rrw, style: { height: 14, display: "flex" } }),
          h("span", {
            style: {
              color: ink, fontWeight: 700, fontSize: 11,
              letterSpacing: "-0.01em", display: "flex",
            },
          }, ">commit"),
        ),
      ),
    ),
    // divider
    h("div", {
      style: {
        width: 1, margin: "16px 0", background: dividerColor,
        display: "flex", flexShrink: 0,
      },
    }),
    // rank column
    h("div", {
      style: {
        minWidth: 82, padding: "0 22px", flexShrink: 0,
        display: "flex", flexDirection: "column",
        alignItems: "flex-start", justifyContent: "center",
      },
    },
      rankBlock,
      palette.kind === "hash"
        ? h("span", {
            style: {
              marginTop: 6, fontSize: 9, letterSpacing: "0.2em",
              textTransform: "uppercase", fontWeight: 700,
              color: palette.tierColor, lineHeight: 1, display: "flex",
            },
          }, tierLabel)
        : null,
      h("span", {
        style: {
          marginTop: 6, fontSize: 9, letterSpacing: "0.2em",
          textTransform: "uppercase", color: inkMute, fontWeight: 600,
          lineHeight: 1, whiteSpace: "nowrap", display: "flex",
        },
      }, QUARTER_LABEL),
    ),
  );

  const svg = await satori(tree, {
    width: 360,
    height: 100,
    fonts: [{ name: "Inter", data: INTER_BOLD, weight: 700, style: "normal" }],
  });
  return svg;
}

// ─── Featured HTML templating ───────────────────────────────────────────────
function buildFeaturedHtml({ template, listOrgs, currentOrg, topN, divisionLabel, logoDataUris }) {
  let html = template;

  // Inline brand asset URLs (used in hero tag + footer).
  html = html.replace(/logos\/osscar-icon\.png/g, ASSETS.osscarIcon);
  html = html.replace(/logos\/brand-supabase\.png/g, ASSETS.supabaseDark);
  html = html.replace(/logos\/brand-rrw\.png/g, ASSETS.rrw);

  // Replace the big card grid.
  const cards = listOrgs.map((o, i) => {
    const rank = i + 1;
    const isFeatured = o.owner_login === currentOrg.owner_login;
    const logoSrc = logoDataUris[o.owner_login] ?? ASSETS.osscarIcon;
    const cls = isFeatured ? "card featured" : "card";
    const pulse = isFeatured ? `<span class="pulse-dot"></span>` : "";
    return `<div class="${cls}">${pulse}<span class="rank">${String(rank).padStart(2, "0")}</span><div class="logo"><img src="${logoSrc}" alt="${escapeHtml(o.owner_name)}"></div><div class="name">${escapeHtml(o.owner_name)}</div></div>`;
  }).join("\n      ");
  html = html.replace(
    /<div class="grid">[\s\S]*?<\/div>\s*<\/section>/,
    `<div class="grid">\n      ${cards}\n    </div>\n  </section>`
  );

  // Replace share-callout.
  const currentLogoSrc = logoDataUris[currentOrg.owner_login] ?? ASSETS.osscarIcon;
  const callout = `<div class="share-callout"><img src="${currentLogoSrc}" alt="${escapeHtml(currentOrg.owner_name)}" class="sc-logo"><span><span class="sc-brand">${escapeHtml(currentOrg.owner_name)}</span> is #${currentOrg.division_rank} ${divisionLabel} · Top ${topN} in OSSCAR</span><span class="sc-arrow">→</span></div>`;
  html = html.replace(/<div class="share-callout">[\s\S]*?<\/div>/, callout);

  // Division-aware copy.
  if (divisionLabel === "Scaling") {
    html = html.replace(/Emerging Organizations/g, "Scaling Organizations");
    html = html.replace(/Top 10 Emerging — OSSCAR/g, "Top 10 Scaling — OSSCAR");
    html = html.replace(/Top 25 Emerging — OSSCAR/g, "Top 25 Scaling — OSSCAR");
    html = html.replace(/OSSCAR · Q1 2026 · Emerging/g, "OSSCAR · Q1 2026 · Scaling");
    html = html.replace(/<h2>Emerging tier/g, "<h2>Scaling tier");
  }

  return html;
}

// ─── Per-company orchestration ──────────────────────────────────────────────
async function generateForCompany({ org, allOrgsInDivision, browser, logoCache }) {
  const divisionLabel = org.division === "scaling" ? "Scaling" : "Emerging";
  const divisionDir = org.division === "scaling" ? "scaling" : "emerging";
  const outDir = path.join(OUT_ROOT, divisionDir, org.owner_login);
  fs.mkdirSync(outDir, { recursive: true });

  const slug = slugFromUrl(org.owner_url) ?? org.owner_login.toLowerCase();

  // 1) Share PNG
  const shareRes = await fetchBuffer(`${DEV_SERVER}/api/og?slug=${encodeURIComponent(slug)}`);
  fs.writeFileSync(path.join(outDir, "share.png"), shareRes.buf);

  if (SHARES_ONLY) return outDir;

  // 2) SVG badges (default + light)
  const orgLogoDataUri =
    logoCache.get(org.owner_login) ??
    (org.owner_logo ? await fetchDataUri(org.owner_logo) : null);
  if (orgLogoDataUri) logoCache.set(org.owner_login, orgLogoDataUri);

  const svgDefault = await renderBadgeSvg({ org, variant: "default", orgLogoDataUri });
  fs.writeFileSync(path.join(outDir, "badge-default.svg"), svgDefault);
  const svgLight = await renderBadgeSvg({ org, variant: "light", orgLogoDataUri });
  fs.writeFileSync(path.join(outDir, "badge-light.svg"), svgLight);

  // 3) Featured HTML + PNG for top 25 only
  if (org.division_rank <= 25) {
    const topN = org.division_rank <= 10 ? 10 : 25;
    const listOrgs = allOrgsInDivision.slice(0, topN);

    // Preload each logo in the list.
    const logoDataUris = {};
    for (const o of listOrgs) {
      if (logoCache.has(o.owner_login)) {
        logoDataUris[o.owner_login] = logoCache.get(o.owner_login);
        continue;
      }
      const uri = o.owner_logo ? await fetchDataUri(o.owner_logo) : null;
      if (uri) {
        logoDataUris[o.owner_login] = uri;
        logoCache.set(o.owner_login, uri);
      }
    }

    const templatePath = path.join(
      TEMPLATE_DIR,
      topN === 10 ? "Top 10 Emerging - Featured.html" : "Top 25 Emerging - Featured.html"
    );
    const template = fs.readFileSync(templatePath, "utf-8");

    const featuredHtml = buildFeaturedHtml({
      template, listOrgs, currentOrg: org, topN, divisionLabel, logoDataUris,
    });

    const baseName = `top-${topN}-${divisionDir}-featured`;
    fs.writeFileSync(path.join(outDir, `${baseName}.html`), featuredHtml);

    // Render HTML → PNG
    const page = await browser.newPage({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 2,
    });
    await page.setContent(featuredHtml, { waitUntil: "networkidle" });
    // Wait a tick for font load
    await page.evaluate(() => document.fonts?.ready);
    const png = await page.screenshot({ fullPage: true, type: "png" });
    await page.close();
    fs.writeFileSync(path.join(outDir, `${baseName}.png`), png);
  }

  return outDir;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Output: ${OUT_ROOT}`);
  console.log(`Dev server: ${DEV_SERVER}`);

  // Quick ping for the dev server.
  try {
    const r = await fetch(`${DEV_SERVER}/api/og?slug=__ping__`);
    if (r.status !== 404 && r.status !== 200) {
      console.warn(`Dev server responded with ${r.status} on ping; continuing`);
    }
  } catch (e) {
    console.error(`Dev server at ${DEV_SERVER} is not reachable. Run 'npm run dev' first.`);
    process.exit(1);
  }

  const browser = await chromium.launch();
  const logoCache = new Map();

  let targets;
  if (TEST_LOGIN) {
    const org = ORG_BY_LOGIN.get(TEST_LOGIN) ?? ORG_BY_LOGIN.get(TEST_LOGIN.toLowerCase());
    if (!org) {
      console.error(`No org with login '${TEST_LOGIN}'. Try one of:`);
      for (const k of [...ORG_BY_LOGIN.keys()].slice(0, 12)) console.error("  ", k);
      process.exit(1);
    }
    targets = [org];
  } else {
    targets = [...emerging, ...scaling];
  }

  let done = 0;
  for (const org of targets) {
    const list = org.division === "scaling" ? scaling : emerging;
    try {
      const out = await generateForCompany({
        org, allOrgsInDivision: list, browser, logoCache,
      });
      done++;
      console.log(`[${done}/${targets.length}] ${org.division}#${org.division_rank} ${org.owner_login} → ${path.relative(REPO_ROOT, out)}`);
    } catch (e) {
      console.error(`[FAIL] ${org.owner_login}:`, e.message);
    }
  }

  await browser.close();
  console.log(`\nDone. ${done}/${targets.length} companies.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
