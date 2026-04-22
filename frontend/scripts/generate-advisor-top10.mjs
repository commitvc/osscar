#!/usr/bin/env node
/* eslint-disable */
/**
 * Render ONE combined Top 10 image (Scaling + Emerging) as PNG + JPG for advisor distribution.
 *
 *   generated/advisors/top-10.png
 *   generated/advisors/top-10.jpg
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(FRONTEND, "..");
const DATA_DIR = path.join(FRONTEND, "data");
const PUBLIC_DIR = path.join(FRONTEND, "public");
const TEMPLATE_DIR = "/Users/abel/Desktop/osscar/project";
const OUT_DIR = path.join(REPO_ROOT, "generated", "advisors");

fs.mkdirSync(OUT_DIR, { recursive: true });

const readPublicDataUri = (f, mime) =>
  `data:${mime};base64,${fs.readFileSync(path.join(PUBLIC_DIR, f)).toString("base64")}`;

const ASSETS = {
  osscarIcon: readPublicDataUri("osscar-icon.png", "image/png"),
  supabase: readPublicDataUri("brand-supabase.png", "image/png"),
  rrw: readPublicDataUri("brand-rrw.png", "image/png"),
};

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

async function fetchDataUri(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get("content-type") ?? "image/png";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function cardsHtml(list) {
  return list.map((o, i) => {
    const rank = String(i + 1).padStart(2, "0");
    const logoSrc = o._logoDataUri ?? ASSETS.osscarIcon;
    return `<div class="card"><span class="rank">${rank}</span><div class="logo"><img src="${logoSrc}" alt="${esc(o.owner_name)}"></div><div class="name">${esc(o.owner_name)}</div></div>`;
  }).join("\n      ");
}

async function main() {
  const emerging = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "osscar_emerging_top100_Q1_2026.json"), "utf-8")
  ).slice(0, 10);
  const scaling = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "osscar_scaling_top100_Q1_2026.json"), "utf-8")
  ).slice(0, 10);

  for (const list of [emerging, scaling]) {
    for (const o of list) {
      o._logoDataUri = o.owner_logo ? await fetchDataUri(o.owner_logo) : null;
    }
  }

  let html = fs.readFileSync(
    path.join(TEMPLATE_DIR, "Top 10 supabase - Featured.html"),
    "utf-8"
  );

  // Inline brand assets.
  html = html.replace(/logos\/osscar-icon\.png/g, ASSETS.osscarIcon);
  html = html.replace(/logos\/brand-supabase\.png/g, ASSETS.supabase);
  html = html.replace(/logos\/brand-rrw\.png/g, ASSETS.rrw);

  // Drop the share-callout.
  html = html.replace(/<div class="share-callout">[\s\S]*?<\/div>\s*/, "");

  // Replace the Scaling tier grid (first grid) then the Emerging tier grid (second).
  const gridBlocks = [...html.matchAll(/<div class="grid">[\s\S]*?<\/div>\s*<\/section>/g)];
  if (gridBlocks.length < 2) throw new Error("Expected two grid sections in template");

  const replacements = [
    { match: gridBlocks[0][0], list: scaling },
    { match: gridBlocks[1][0], list: emerging },
  ];
  // Apply bottom-up to keep indices valid.
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { match, list } = replacements[i];
    const rebuilt = `<div class="grid">\n      ${cardsHtml(list)}\n    </div>\n  </section>`;
    html = html.slice(0, gridBlocks[i].index) + rebuilt + html.slice(gridBlocks[i].index + match.length);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);
  const png = await page.screenshot({ fullPage: true, type: "png" });
  await page.close();
  await browser.close();

  const pngPath = path.join(OUT_DIR, "top-10.png");
  const jpgPath = path.join(OUT_DIR, "top-10.jpg");

  fs.writeFileSync(pngPath, png);
  await sharp(png).flatten({ background: "#1c1c1c" }).jpeg({ quality: 92 }).toFile(jpgPath);

  // Clean up the older split files.
  for (const leftover of [
    "top-10-emerging.png", "top-10-emerging.jpg",
    "top-10-scaling.png", "top-10-scaling.jpg",
  ]) {
    const p = path.join(OUT_DIR, leftover);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log(`→ ${path.relative(REPO_ROOT, pngPath)}`);
  console.log(`→ ${path.relative(REPO_ROOT, jpgPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
