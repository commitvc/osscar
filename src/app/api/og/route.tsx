import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getAbove1000, getBelow1000, extractSlug } from "@/lib/data";
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

  const aboveOrg = above.find((o) => extractSlug(o.owner_url) === slug);
  const belowOrg = below.find((o) => extractSlug(o.owner_url) === slug);
  const org = aboveOrg ?? belowOrg;

  if (!org) return new Response("Not found", { status: 404 });

  const tierData = aboveOrg ? above : below;
  const rankIndex = tierData.findIndex((o) => extractSlug(o.owner_url) === slug);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const tierLabel = aboveOrg ? "Scaling" : "Emerging";

  const name = org.owner_name;
  const logoUrl = org.owner_logo;

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

  // Dynamic sizing
  const displayName = name.length > 28 ? name.slice(0, 27) + "…" : name;
  const nameFontSize =
    displayName.length <= 10 ? 48
    : displayName.length <= 16 ? 40
    : displayName.length <= 22 ? 34
    : 28;

  const rankColor = rank ? getRankColor(rank) : "rgba(255,255,255,0.45)";

  // Bigger rank number now that metrics are gone
  const rankFontSize = !rank ? 180 : rank < 10 ? 220 : rank < 100 ? 178 : 138;

  // Tier badge colors
  const tierColor = aboveOrg ? "#3ECF8E" : "#60A5FA";
  const tierBg = aboveOrg ? "rgba(62,207,142,0.1)" : "rgba(96,165,250,0.1)";
  const tierBorder = aboveOrg ? "rgba(62,207,142,0.28)" : "rgba(96,165,250,0.28)";

  // Description (trimmed to fit one line)
  const rawDesc = org.owner_description;
  const description = rawDesc
    ? rawDesc.length > 95
      ? rawDesc.slice(0, 94) + "…"
      : rawDesc
    : null;

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
            padding: "44px 64px 0",
          }}
        >
          {/* ── Org identity row ── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "22px" }}>
            {/* Logo */}
            {orgLogoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogoDataUrl}
                alt={displayName}
                style={{
                  width: "88px",
                  height: "88px",
                  borderRadius: "18px",
                  objectFit: "contain",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "88px",
                  height: "88px",
                  borderRadius: "18px",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "36px",
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
                paddingTop: "4px",
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

              {/* URL + tier badge row */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {org.homepage_url && (
                  <span
                    style={{
                      color: "rgba(255,255,255,0.28)",
                      fontSize: "12px",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {org.homepage_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                )}
                {/* Tier badge pill */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "3px 11px",
                    borderRadius: "100px",
                    border: `1px solid ${tierBorder}`,
                    backgroundColor: tierBg,
                  }}
                >
                  <span
                    style={{
                      color: tierColor,
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    {tierLabel} Tier
                  </span>
                </div>
              </div>

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
              position: "relative",
            }}
          >
            {/* Subtle rank glow */}
            {rank && (
              <div
                style={{
                  position: "absolute",
                  width: "500px",
                  height: "280px",
                  background: `radial-gradient(ellipse at center, ${rankColor}14 0%, transparent 68%)`,
                  display: "flex",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}

            {rank ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.18)",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.55em",
                    textTransform: "uppercase",
                    marginBottom: "2px",
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
                    lineHeight: 0.9,
                    display: "flex",
                  }}
                >
                  #{rank}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "16px",
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    marginTop: "22px",
                    display: "flex",
                  }}
                >
                  OSS Growth Index · Q1 2026
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
              style={{ height: "26px", opacity: 0.7 }}
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
              style={{ height: "28px", opacity: 0.75 }}
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
