import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getAbove1000, getBelow1000, extractSlug } from "@/lib/data";
import { formatGrowthRate, formatCompact } from "@/lib/utils";
import fs from "fs";
import path from "path";

// ─── Font loader ──────────────────────────────────────────────────────────────

let interBoldData: ArrayBuffer | null = null;

async function getInterBold(): Promise<ArrayBuffer | null> {
  if (interBoldData) return interBoldData;
  try {
    const fontPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      "Inter-Bold.ttf"
    );
    interBoldData = fs.readFileSync(fontPath).buffer as ArrayBuffer;
    return interBoldData;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRankColor(rank: number): string {
  if (rank === 1) return "#F4C430";
  if (rank <= 3) return "#E8A020";
  if (rank <= 10) return "#3ECF8E";
  return "rgba(255,255,255,0.7)";
}

function getRankBadgeBorder(rank: number | null): string {
  if (!rank) return "1px solid rgba(255,255,255,0.15)";
  if (rank === 1) return "1px solid rgba(244,196,48,0.45)";
  if (rank <= 3) return "1px solid rgba(232,160,32,0.4)";
  if (rank <= 10) return "1px solid rgba(62,207,142,0.35)";
  return "1px solid rgba(255,255,255,0.15)";
}

function getRankBadgeBg(rank: number | null): string {
  if (!rank) return "rgba(255,255,255,0.05)";
  if (rank === 1) return "rgba(244,196,48,0.12)";
  if (rank <= 3) return "rgba(232,160,32,0.1)";
  if (rank <= 10) return "rgba(62,207,142,0.1)";
  return "rgba(255,255,255,0.05)";
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/png";
    return `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return null;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.toLowerCase() ?? "";

  const above = getAbove1000();
  const below = getBelow1000();

  const aboveOrg = above.find((o) => extractSlug(o.github_owner_url) === slug);
  const belowOrg = below.find((o) => extractSlug(o.github_owner_url) === slug);
  const org = aboveOrg ?? belowOrg;

  if (!org) return new Response("Not found", { status: 404 });

  const tierData = aboveOrg ? above : below;
  const rankIndex = tierData.findIndex((o) => extractSlug(o.github_owner_url) === slug);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const tierLabel = aboveOrg ? "Scaling" : "Emerging";

  const name = org.company_name;
  const country = org.country;
  const logoUrl = org.logo_url;

  // Static assets
  const supabasePng = fs.readFileSync(
    path.join(process.cwd(), "public", "supabase-logo-wordmark--dark.png")
  );
  const supabaseDataUrl = `data:image/png;base64,${supabasePng.toString("base64")}`;

  const commitSvg = fs.readFileSync(
    path.join(process.cwd(), "public", "commit-logo-dark.svg")
  );
  const commitLogoDataUrl = `data:image/svg+xml;base64,${commitSvg.toString("base64")}`;

  // Org logo
  const orgLogoDataUrl = logoUrl ? await fetchImageAsDataUrl(logoUrl) : null;

  // Font
  const fontData = await getInterBold();

  // Active signals only
  const signals = [
    { label: "GitHub Stars", rate: org.github_stars_growth_rate, end: org.github_stars_end, color: "#F4C430" },
    { label: "Contributors", rate: org.github_contributors_growth_rate, end: org.github_contributors_end, color: "#60A5FA" },
    { label: "NPM Downloads", rate: org.npm_downloads_growth_rate, end: org.npm_downloads_end, color: "#FB923C" },
    { label: "PyPI Downloads", rate: org.pypi_downloads_growth_rate, end: org.pypi_downloads_end, color: "#A78BFA" },
  ].filter((s) => s.rate != null);

  // Dynamic sizing
  const displayName = name.length > 28 ? name.slice(0, 27) + "…" : name;
  const nameFontSize =
    displayName.length <= 10 ? 44
    : displayName.length <= 16 ? 38
    : displayName.length <= 22 ? 32
    : 28;

  const rankColor = rank ? getRankColor(rank) : "rgba(255,255,255,0.45)";

  // Rank number font size: big for single digit, smaller for multi-digit
  const rankFontSize = !rank ? 120 : rank < 10 ? 148 : rank < 100 ? 120 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          backgroundColor: "#0f0f0f",
          fontFamily: "Inter, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* ── Top accent line ── */}
        <div
          style={{
            height: "4px",
            backgroundColor: "#3ECF8E",
            display: "flex",
            flexShrink: 0,
          }}
        />

        {/* ── Main content ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "36px 64px 0",
          }}
        >
          {/* ── Org identity row (compact) ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            {/* Logo */}
            {orgLogoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogoDataUrl}
                alt={displayName}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "14px",
                  objectFit: "contain",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "14px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "28px",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name + meta */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                flex: 1,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  color: "white",
                  fontSize: `${nameFontSize}px`,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                {displayName}
              </span>

              {/* Country only */}
              {country && (
                <span
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "11px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {country}
                </span>
              )}
            </div>
          </div>

          {/* ── Rank hero ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
            }}
          >
            {rank ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0px",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.25)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.4em",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    display: "flex",
                  }}
                >
                  RANKED
                </span>
                <span
                  style={{
                    color: rankColor,
                    fontSize: `${rankFontSize}px`,
                    fontWeight: 800,
                    letterSpacing: "-0.05em",
                    lineHeight: 1,
                    display: "flex",
                  }}
                >
                  #{rank}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.45)",
                    fontSize: "13px",
                    fontWeight: 600,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginTop: "16px",
                    display: "flex",
                  }}
                >
                  OSSCAR Index · Q4 2025 · {tierLabel} Tier
                </span>
              </div>
            ) : (
              <span
                style={{
                  color: "rgba(255,255,255,0.2)",
                  fontSize: "48px",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  display: "flex",
                }}
              >
                —
              </span>
            )}
          </div>

          {/* ── Metric cards (compact) ── */}
          {signals.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "36px",
                flexShrink: 0,
              }}
            >
              {signals.map((s) => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "16px 20px",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.28)",
                      fontSize: "8px",
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      color: s.color,
                      fontSize: "38px",
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    }}
                  >
                    {formatGrowthRate(s.rate)}
                  </span>
                  {s.end != null && (
                    <span
                      style={{
                        color: "rgba(255,255,255,0.22)",
                        fontSize: "12px",
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {formatCompact(s.end)} total
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom branding bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 64px",
            height: "56px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.22)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            osscar.io
          </span>

          <div
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={supabaseDataUrl}
              alt="Supabase"
              style={{ height: "20px", opacity: 0.7 }}
            />
            <span
              style={{
                color: "rgba(255,255,255,0.2)",
                fontSize: "15px",
                fontWeight: 400,
              }}
            >
              ×
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={commitLogoDataUrl}
              alt=">commit"
              style={{ height: "22px", opacity: 0.75 }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fontData
        ? { fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }] }
        : {}),
    }
  );
}
