import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getAbove1000, getBelow1000, extractSlug } from "@/lib/data";
import {
  getTopN,
  getRankColor,
  getOscarFile,
  getInterBold,
  readPublicAsBase64,
  fetchImageAsDataUrl,
} from "@/lib/og-helpers";
import { QUARTER_LABEL } from "@/lib/config";

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
  const supabaseDataUrl = readPublicAsBase64("supabase-logo-wordmark--dark.png", "image/png");
  const commitLogoDataUrl = readPublicAsBase64("commit-logo-dark.svg", "image/svg+xml");

  // OSSCAR icon
  const oscarFile = rank ? getOscarFile(rank) : "osscar-logo-icon-white.png";
  const oscarDataUrl = readPublicAsBase64(oscarFile, "image/png");

  // Org logo
  const orgLogoDataUrl = logoUrl ? await fetchImageAsDataUrl(logoUrl) : null;

  // Font
  const fontData = await getInterBold();

  // Dynamic name sizing
  const displayName = name.length > 26 ? name.slice(0, 25) + "…" : name;
  const nameFontSize =
    displayName.length <= 8  ? 72
    : displayName.length <= 12 ? 64
    : displayName.length <= 17 ? 56
    : displayName.length <= 22 ? 48
    : 42;

  const rankColor = rank ? getRankColor(rank) : "rgba(255,255,255,0.4)";
  const topN = rank ? getTopN(rank) : null;

  // Tier badge colors
  const tierColor = aboveOrg ? "#3ECF8E" : "#60A5FA";
  const tierBg = aboveOrg ? "rgba(62,207,142,0.12)" : "rgba(96,165,250,0.12)";
  const tierBorder = aboveOrg ? "rgba(62,207,142,0.3)" : "rgba(96,165,250,0.3)";

  // Glow color behind logo — rank 1 gets amber glow, rank 2 silver, rank 3 bronze, rest: tier color
  const glowColor =
    rank === 1 ? "rgba(240,180,41,0.18)"
    : rank === 2 ? "rgba(200,208,218,0.14)"
    : rank === 3 ? "rgba(200,121,65,0.18)"
    : aboveOrg  ? "rgba(62,207,142,0.14)"
    : "rgba(96,165,250,0.14)";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: "linear-gradient(160deg, #111111 0%, #0a0a0a 50%, #0c0c0c 100%)",
          fontFamily: "Inter, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* ── Top accent line ── */}
        <div
          style={{
            height: "4px",
            background: "linear-gradient(90deg, #3ECF8E 0%, #2db87a 100%)",
            display: "flex",
            flexShrink: 0,
          }}
        />

        {/* ── Main content ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "0 80px",
            position: "relative",
          }}
        >
          {/* Ambient glow behind logo */}
          <div
            style={{
              position: "absolute",
              top: "0px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "700px",
              height: "360px",
              background: `radial-gradient(ellipse at center top, ${glowColor} 0%, transparent 62%)`,
              display: "flex",
            }}
          />

          {/* ── Identity block (logo + name) ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "relative",
              gap: "18px",
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {orgLogoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgLogoDataUrl}
                  alt={displayName}
                  style={{
                    width: "112px",
                    height: "112px",
                    borderRadius: "22px",
                    objectFit: "contain",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(255,255,255,0.12)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "112px",
                    height: "112px",
                    borderRadius: "22px",
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: "1.5px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "48px",
                    fontWeight: 800,
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Org name */}
            <span
              style={{
                color: "white",
                fontSize: `${nameFontSize}px`,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1,
                textAlign: "center",
                display: "flex",
              }}
            >
              {displayName}
            </span>

            {/* Tier badge — tucked under name */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 14px",
                borderRadius: "100px",
                backgroundColor: tierBg,
                border: `1px solid ${tierBorder}`,
                marginTop: "-4px",
              }}
            >
              <span
                style={{
                  color: tierColor,
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  display: "flex",
                }}
              >
                {tierLabel} Tier
              </span>
            </div>
          </div>

          {/* ── Achievement + index block ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              position: "relative",
              marginTop: "48px",
            }}
          >
            {/* Achievement row */}
            {rank && topN !== null ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "22px",
                  padding: "20px",
                  borderRadius: "18px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: `1px solid ${rankColor}45`,
                  minWidth: "540px",
                }}
              >
                {/* OSSCAR icon */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={oscarDataUrl}
                  alt="Award"
                  style={{
                    height: "100px",
                    width: "77px",
                    objectFit: "contain",
                    flexShrink: 0,
                  }}
                />

                {/* Text */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span
                    style={{
                      color: rankColor,
                      fontSize: "48px",
                      fontWeight: 800,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      display: "flex",
                    }}
                  >
                    {rank <= 3 ? `#${rank}` : `Top ${topN}`}
                  </span>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.38)",
                      fontSize: "16px",
                      fontWeight: 600,
                      letterSpacing: "0.01em",
                      display: "flex",
                    }}
                  >
                    out of +80K open source organizations
                  </span>
                </div>
              </div>
            ) : null}

          </div>
        </div>

        {/* ── Bottom branding bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 64px",
            height: "64px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          {/* Left: index name + osscar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                display: "flex",
              }}
            >
              OSS Growth Index · {QUARTER_LABEL}
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.2)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                display: "flex",
              }}
            >
              osscar.io
            </span>
          </div>

          <div
            style={{ display: "flex", alignItems: "center", gap: "14px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={supabaseDataUrl}
              alt="Supabase"
              style={{ height: "24px", opacity: 0.65 }}
            />
            <span
              style={{
                color: "rgba(255,255,255,0.18)",
                fontSize: "14px",
                fontWeight: 400,
                display: "flex",
              }}
            >
              ×
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={commitLogoDataUrl}
              alt=">commit"
              style={{ height: "26px", opacity: 0.7 }}
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
