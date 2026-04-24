import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { findOrgBySlug } from "@/lib/data";
import {
  getInterBold,
  readPublicAsBase64,
  fetchImageAsDataUrl,
} from "@/lib/og-helpers";
import { QUARTER_LABEL } from "@/lib/config";

// ─── Variants ─────────────────────────────────────────────────────────────────

type Variant = "default" | "light" | "compact" | "compact-light";

function parseVariant(raw: string | null): Variant {
  const v = (raw ?? "").toLowerCase();
  if (v === "light") return "light";
  if (v === "compact") return "compact";
  if (v === "compact-light" || v === "compactlight" || v === "compact_light")
    return "compact-light";
  return "default";
}

// ─── Rank palette ────────────────────────────────────────────────────────────

type RankPalette = {
  kind: "hash" | "top";
  label: string; // "1", "2", "3", "10" or "25", "50", "100"
  rankColor: string;
  hashColor: string;
  tierColor: string;
};

function getRankPalette(rank: number, light: boolean): RankPalette {
  // #1 amber, #2 silver, #3 bronze, #4-10 white
  if (rank === 1) {
    return {
      kind: "hash",
      label: String(rank),
      rankColor: light ? "#c48a08" : "#f1d579",
      hashColor: light ? "#9a6a00" : "#eab308",
      tierColor: light ? "#a77b0a" : "#f1d579",
    };
  }
  if (rank === 2) {
    return {
      kind: "hash",
      label: String(rank),
      rankColor: light ? "#707070" : "#d7d7d7",
      hashColor: light ? "#a0a0a0" : "#9a9a9a",
      tierColor: light ? "#707070" : "#b4b4b4",
    };
  }
  if (rank === 3) {
    return {
      kind: "hash",
      label: String(rank),
      rankColor: light ? "#8a5321" : "#cd7f32",
      hashColor: light ? "#b07843" : "#8a5321",
      tierColor: light ? "#8a5321" : "#a8672a",
    };
  }
  if (rank <= 10) {
    return {
      kind: "hash",
      label: String(rank),
      rankColor: light ? "#111111" : "#ffffff",
      hashColor: light ? "#888888" : "#a0a0a0",
      tierColor: light ? "#555555" : "#dcdcdc",
    };
  }
  // Top-N tier buckets
  if (rank <= 25) {
    return {
      kind: "top",
      label: "25",
      rankColor: light ? "#111111" : "#ffffff",
      hashColor: light ? "#666666" : "#9a9a9a",
      tierColor: light ? "#555555" : "#dcdcdc",
    };
  }
  if (rank <= 50) {
    return {
      kind: "top",
      label: "50",
      rankColor: light ? "#333333" : "#d0d0d0",
      hashColor: light ? "#777777" : "#8a8a8a",
      tierColor: light ? "#555555" : "#dcdcdc",
    };
  }
  return {
    kind: "top",
    label: "100",
    rankColor: light ? "#555555" : "#aeaeae",
    hashColor: light ? "#888888" : "#6f6f6f",
    tierColor: light ? "#555555" : "#dcdcdc",
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.toLowerCase() ?? "";
  const variant = parseVariant(searchParams.get("variant"));

  const org = findOrgBySlug(slug);
  if (!org) return new Response("Not found", { status: 404 });

  const isLight = variant === "light" || variant === "compact-light";
  const isCompact = variant === "compact" || variant === "compact-light";

  const rank = org.division_rank;
  const tierLabel = org.division === "scaling" ? "Scaling" : "Emerging";
  const palette = getRankPalette(rank, isLight);

  // Brand assets
  const supabaseDataUrl = readPublicAsBase64(
    isLight ? "brand-supabase-dark.png" : "brand-supabase.png",
    "image/png"
  );
  const rrwDataUrl = readPublicAsBase64("brand-rrw.png", "image/png");
  const orgLogoDataUrl = org.owner_logo
    ? await fetchImageAsDataUrl(org.owner_logo)
    : null;

  const fontData = await getInterBold();

  // Palette for background / borders / text
  const bg = isLight ? "#ffffff" : "#141414";
  const bgEnd = isLight ? "#fafafa" : "#1a1a1a";
  const borderColor = isLight ? "#e6e6e6" : "#2a2a2a";
  const ink = isLight ? "#111111" : "#ededed";
  const inkMute = isLight ? "#888888" : "#6f6f6f";
  const dividerColor = isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.12)";

  // ─────────── COMPACT (260 × 64) ───────────
  if (isCompact) {
    const W = 260;
    const H = 64;
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: `${W}px`,
            height: `${H}px`,
            background: `linear-gradient(180deg, ${bg} 0%, ${bgEnd} 100%)`,
            border: `1px solid ${borderColor}`,
            borderRadius: "12px",
            overflow: "hidden",
            fontFamily: "Inter, sans-serif",
            color: ink,
          }}
        >
          {/* Left accent bar */}
          <div
            style={{
              width: "3px",
              background: "linear-gradient(180deg, #3ECF8E 0%, #2a9f6e 100%)",
              flexShrink: 0,
              display: "flex",
            }}
          />

          {/* Main column */}
          <div
            style={{
              flex: 1,
              padding: "10px 14px 10px 12px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "3px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "8px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: inkMute,
                fontWeight: 600,
              }}
            >
              {orgLogoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgLogoDataUrl}
                  alt=""
                  style={{
                    width: "13px",
                    height: "13px",
                    borderRadius: "3px",
                    objectFit: "cover",
                    display: "flex",
                  }}
                />
              )}
              <span style={{ display: "flex" }}>Featured · OSSCAR</span>
            </div>
            <span
              style={{
                fontSize: "16px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: ink,
                lineHeight: 1,
                display: "flex",
                marginTop: "1px",
              }}
            >
              Top 10 · {tierLabel}
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: "1px",
              margin: "10px 0",
              background: dividerColor,
              display: "flex",
              flexShrink: 0,
            }}
          />

          {/* Rank column */}
          <div
            style={{
              minWidth: "82px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "0 14px",
              flexShrink: 0,
            }}
          >
            {palette.kind === "hash" ? (
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span
                  style={{
                    fontSize: "14px",
                    color: palette.hashColor,
                    fontWeight: 500,
                    marginRight: "1px",
                    display: "flex",
                    lineHeight: 1,
                  }}
                >
                  #
                </span>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    color: palette.rankColor,
                    lineHeight: 1,
                    display: "flex",
                  }}
                >
                  {palette.label}
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span
                  style={{
                    fontSize: "8px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: palette.hashColor,
                    fontWeight: 700,
                    display: "flex",
                    lineHeight: 1,
                  }}
                >
                  TOP
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    color: palette.rankColor,
                    lineHeight: 1,
                    display: "flex",
                  }}
                >
                  {palette.label}
                </span>
              </div>
            )}
            <span
              style={{
                fontSize: "8px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: inkMute,
                fontWeight: 600,
                marginTop: "4px",
                display: "flex",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {QUARTER_LABEL}
            </span>
          </div>
        </div>
      ),
      {
        width: W,
        height: H,
        // Cache-Control is set via next.config.ts headers() so the response
        // still picks up the site's security headers. Passing `headers` here
        // would suppress that merging.
        ...(fontData
          ? { fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }] }
          : {}),
      }
    );
  }

  // ─────────── DEFAULT / LIGHT (360 × 100) ───────────
  const W = 360;
  const H = 100;
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: `${W}px`,
          height: `${H}px`,
          background: `linear-gradient(180deg, ${bg} 0%, ${bgEnd} 100%)`,
          border: `1px solid ${borderColor}`,
          borderRadius: "12px",
          overflow: "hidden",
          fontFamily: "Inter, sans-serif",
          color: ink,
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            width: "4px",
            background: "linear-gradient(180deg, #3ECF8E 0%, #2a9f6e 100%)",
            flexShrink: 0,
            display: "flex",
          }}
        />

        {/* Main column */}
        <div
          style={{
            flex: 1,
            padding: "14px 18px 14px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "6px",
            minWidth: 0,
          }}
        >
          {/* Featured on row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "9px",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: inkMute,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {orgLogoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogoDataUrl}
                alt=""
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  objectFit: "cover",
                  display: "flex",
                }}
              />
            )}
            <span style={{ display: "flex" }}>Featured on</span>
          </div>

          {/* Wordmark */}
          <span
            style={{
              fontSize: "22px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: ink,
              lineHeight: 1,
              marginTop: "1px",
              display: "flex",
            }}
          >
            OSSCAR
          </span>

          {/* by supabase × commit */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "2px",
            }}
          >
            <span
              style={{
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontSize: "9px",
                color: inkMute,
                fontWeight: 600,
                display: "flex",
              }}
            >
              by
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={supabaseDataUrl}
              alt="supabase"
              style={{ height: "13px", display: "flex" }}
            />
            <span
              style={{ color: inkMute, fontSize: "10px", display: "flex" }}
            >
              ×
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rrwDataUrl}
                alt=""
                style={{ height: "14px", display: "flex" }}
              />
              <span
                style={{
                  color: ink,
                  fontWeight: 700,
                  fontSize: "11px",
                  letterSpacing: "-0.01em",
                  display: "flex",
                }}
              >
                &gt;commit
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: "1px",
            margin: "16px 0",
            background: dividerColor,
            display: "flex",
            flexShrink: 0,
          }}
        />

        {/* Rank column */}
        <div
          style={{
            minWidth: "88px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "0 22px",
            flexShrink: 0,
          }}
        >
          {palette.kind === "hash" ? (
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span
                style={{
                  fontSize: "21px",
                  color: palette.hashColor,
                  fontWeight: 500,
                  marginRight: "2px",
                  display: "flex",
                  lineHeight: 1,
                }}
              >
                #
              </span>
              <span
                style={{
                  fontSize: "34px",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: palette.rankColor,
                  lineHeight: 1,
                  display: "flex",
                }}
              >
                {palette.label}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <span
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: palette.hashColor,
                  fontWeight: 700,
                  display: "flex",
                  lineHeight: 1,
                }}
              >
                TOP
              </span>
              <span
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: palette.rankColor,
                  lineHeight: 1,
                  display: "flex",
                }}
              >
                {palette.label}
              </span>
            </div>
          )}
          {palette.kind === "hash" && (
            <span
              style={{
                marginTop: "6px",
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: palette.tierColor,
                lineHeight: 1,
                display: "flex",
              }}
            >
              {tierLabel}
            </span>
          )}
          <span
            style={{
              marginTop: "6px",
              fontSize: "9px",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: inkMute,
              fontWeight: 600,
              lineHeight: 1,
              display: "flex",
            }}
          >
            {QUARTER_LABEL}
          </span>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      // Cache-Control set via next.config.ts headers() — see compact branch.
      ...(fontData
        ? { fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }] }
        : {}),
    }
  );
}
