import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getAbove1000, getBelow1000, extractSlug } from "@/lib/data";
import {
  getRankColor,
  getOscarFile,
  getInterBold,
  readPublicAsBase64,
} from "@/lib/og-helpers";

const W = 340;
const H = 96;

/** Rank label font size — scales down for more digits */
function getRankFontSize(label: string): number {
  if (label.length <= 2) return 34; // "#1" … "#9"
  if (label.length <= 3) return 30; // "#10" … "#99"
  return 24;                        // "#100" … "#200"
}

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

  // Static assets
  const supabaseDataUrl = readPublicAsBase64("supabase-logo-wordmark--dark.png", "image/png");
  const commitLogoDataUrl = readPublicAsBase64("commit-logo-dark.svg", "image/svg+xml");

  // Oscar statue — color-matched to rank
  const oscarFile = rank ? getOscarFile(rank) : "oscar-white.png";
  const oscarDataUrl = readPublicAsBase64(oscarFile, "image/png");

  const fontData = await getInterBold();

  const rankColor = rank ? getRankColor(rank) : "rgba(255,255,255,0.4)";
  const rankLabel = rank ? `#${rank}` : "—";
  const rankFontSize = getRankFontSize(rankLabel);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: `${W}px`,
          height: `${H}px`,
          background: "#0f0f0f",
          fontFamily: "Inter, sans-serif",
          overflow: "hidden",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {/* ── Left accent bar ── */}
        <div
          style={{
            width: "4px",
            height: "100%",
            background: "linear-gradient(180deg, #3ECF8E 0%, #2db87a 100%)",
            flexShrink: 0,
            display: "flex",
          }}
        />

        {/* ── Oscar statue ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 10px 0 14px",
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={oscarDataUrl}
            alt="OSSCAR"
            style={{
              height: "48px",
              width: "24px",
              objectFit: "contain",
              opacity: rank ? 1 : 0.4,
            }}
          />
        </div>

        {/* ── Middle: OSSCAR branding ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            gap: "0px",
            overflow: "hidden",
          }}
        >
          {/* FEATURED ON */}
          <span
            style={{
              color: "rgba(255,255,255,0.32)",
              fontSize: "7.5px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              display: "flex",
              marginBottom: "3px",
            }}
          >
            FEATURED ON
          </span>

          {/* OSSCAR */}
          <span
            style={{
              color: "white",
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1,
              display: "flex",
              marginBottom: "5px",
            }}
          >
            OSSCAR
          </span>

          {/* by Supabase × >commit */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.32)",
                fontSize: "9.5px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                display: "flex",
              }}
            >
              by
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={supabaseDataUrl}
              alt="Supabase"
              style={{ height: "12px", opacity: 0.55 }}
            />
            <span
              style={{
                color: "rgba(255,255,255,0.2)",
                fontSize: "11px",
                display: "flex",
              }}
            >
              ×
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={commitLogoDataUrl}
              alt=">commit"
              style={{ height: "13px", opacity: 0.55 }}
            />
          </div>
        </div>

        {/* ── Divider ── */}
        <div
          style={{
            width: "1px",
            height: "56px",
            alignSelf: "center",
            background: "rgba(255,255,255,0.07)",
            flexShrink: 0,
            display: "flex",
          }}
        />

        {/* ── Right: rank block ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "88px",
            height: "100%",
            gap: "4px",
            flexShrink: 0,
            background: "rgba(255,255,255,0.015)",
          }}
        >
          {/* Rank label */}
          <span
            style={{
              color: rankColor,
              fontSize: `${rankFontSize}px`,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              display: "flex",
            }}
          >
            {rankLabel}
          </span>

          {/* Quarter */}
          <span
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "7px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Q1 2026
          </span>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
      ...(fontData
        ? { fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }] }
        : {}),
    }
  );
}
