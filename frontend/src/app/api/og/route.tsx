import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { findOrgBySlug } from "@/lib/data";
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

  const org = findOrgBySlug(slug);
  if (!org) return new Response("Not found", { status: 404 });

  const isScaling = org.division === "scaling";
  const rank: number | null = org.division_rank ?? null;
  const tierLabel = isScaling ? "Scaling" : "Emerging";

  const name = org.owner_name;
  const logoUrl = org.owner_logo;

  // Static assets
  const supabaseDataUrl = readPublicAsBase64("supabase-logo-wordmark--dark.png", "image/png");
  const commitLogoDataUrl = readPublicAsBase64("commit-logo-dark.svg", "image/svg+xml");

  const oscarFile = rank ? getOscarFile(rank) : "osscar-logo-icon-white.png";
  const oscarDataUrl = readPublicAsBase64(oscarFile, "image/png");

  const orgLogoDataUrl = logoUrl ? await fetchImageAsDataUrl(logoUrl) : null;

  const fontData = await getInterBold();

  // Name sizing
  const displayName = name.length > 22 ? name.slice(0, 21) + "…" : name;
  const nameFontSize =
    displayName.length <= 6   ? 80
    : displayName.length <= 9  ? 68
    : displayName.length <= 13 ? 56
    : displayName.length <= 17 ? 46
    : displayName.length <= 22 ? 38
    : 32;

  const rankColor = rank ? getRankColor(rank) : "rgba(255,255,255,0.55)";
  const topN = rank ? getTopN(rank) : null;
  const rankDisplay = rank && rank <= 3 ? `#${rank}` : topN ? `Top ${topN}` : "—";
  // Size rank font to string length so it never overflows its column
  const rankFontSize = (() => {
    const len = rankDisplay.length;
    if (len <= 2) return 168;  // #1, #2, #3
    if (len <= 5) return 112;  // Top 3
    if (len <= 6) return 96;   // Top 10, Top 20, Top 50
    if (len <= 7) return 82;   // Top 100, Top 500
    return 72;                  // Top 1000
  })();
  const trophyHeight = rank && rank <= 3 ? 170 : 138;
  const trophyWidth = Math.round(trophyHeight * 131 / 170);

  // Tier badge colors
  const tierColor = isScaling ? "#3ECF8E" : "#60A5FA";
  const tierBg = isScaling ? "rgba(62,207,142,0.10)" : "rgba(96,165,250,0.10)";
  const tierBorder = isScaling ? "rgba(62,207,142,0.32)" : "rgba(96,165,250,0.32)";

  const glowColor =
    rank === 1 ? "rgba(240,180,41,0.22)"
    : rank === 2 ? "rgba(200,208,218,0.18)"
    : rank === 3 ? "rgba(200,121,65,0.22)"
    : isScaling  ? "rgba(62,207,142,0.18)"
    : "rgba(96,165,250,0.18)";

  const rankGlow =
    rank === 1 ? "rgba(240,180,41,0.35)"
    : rank === 2 ? "rgba(200,208,218,0.28)"
    : rank === 3 ? "rgba(200,121,65,0.35)"
    : `${rankColor}40`;

  const accentColor = rank && rank <= 3 ? rankColor : tierColor;
  const bracketColor = rank && rank <= 3 ? `${rankColor}55` : "rgba(255,255,255,0.12)";

  const CORNER_SIZE = 22;
  const CORNER_THICKNESS = 1.5;
  const CORNER_INSET = 32;

  function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
    const isTop = pos === "tl" || pos === "tr";
    const isLeft = pos === "tl" || pos === "bl";
    return (
      <div
        style={{
          position: "absolute",
          ...(isTop ? { top: `${CORNER_INSET}px` } : { bottom: `${CORNER_INSET}px` }),
          ...(isLeft ? { left: `${CORNER_INSET}px` } : { right: `${CORNER_INSET}px` }),
          width: `${CORNER_SIZE}px`,
          height: `${CORNER_SIZE}px`,
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            ...(isTop ? { top: 0 } : { bottom: 0 }),
            ...(isLeft ? { left: 0 } : { right: 0 }),
            width: `${CORNER_SIZE}px`,
            height: `${CORNER_THICKNESS}px`,
            backgroundColor: bracketColor,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            ...(isTop ? { top: 0 } : { bottom: 0 }),
            ...(isLeft ? { left: 0 } : { right: 0 }),
            width: `${CORNER_THICKNESS}px`,
            height: `${CORNER_SIZE}px`,
            backgroundColor: bracketColor,
            display: "flex",
          }}
        />
      </div>
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background:
            "radial-gradient(ellipse 120% 80% at 50% 0%, #171717 0%, #0a0a0a 55%, #050505 100%)",
          fontFamily: "Inter, sans-serif",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ── Hairline top accent ── */}
        <div
          style={{
            height: "2px",
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}88 20%, ${accentColor} 50%, ${accentColor}88 80%, transparent 100%)`,
            display: "flex",
            flexShrink: 0,
          }}
        />

        {/* ── Ambient glows, one per column ── */}
        <div
          style={{
            position: "absolute",
            top: "80px",
            left: "-40px",
            width: "680px",
            height: "520px",
            background: `radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 65%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "60px",
            right: "-120px",
            width: "740px",
            height: "540px",
            background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 60%)`,
            display: "flex",
          }}
        />

        {/* ── Certificate corner brackets ── */}
        <CornerBracket pos="tl" />
        <CornerBracket pos="tr" />

        {/* ── Top header label ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: "34px",
            gap: "14px",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "1px",
              backgroundColor: "rgba(255,255,255,0.22)",
              display: "flex",
            }}
          />
          <span
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Index of fastest growing Open Source organizations · {QUARTER_LABEL}
          </span>
          <div
            style={{
              width: "28px",
              height: "1px",
              backgroundColor: "rgba(255,255,255,0.22)",
              display: "flex",
            }}
          />
        </div>

        {/* ── Two-column body ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "0 72px",
            gap: "40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* ── LEFT column: identity ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: "22px",
              flex: "1 1 0",
              minWidth: 0,
            }}
          >
            {orgLogoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogoDataUrl}
                alt={displayName}
                style={{
                  width: "104px",
                  height: "104px",
                  borderRadius: "24px",
                  objectFit: "contain",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  display: "flex",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "104px",
                  height: "104px",
                  borderRadius: "24px",
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "48px",
                  fontWeight: 800,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            <span
              style={{
                color: "white",
                fontSize: `${nameFontSize}px`,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1.15,
                display: "flex",
                paddingBottom: "4px",
              }}
            >
              {displayName}
            </span>

            {/* Tier badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: "100px",
                backgroundColor: tierBg,
                border: `1px solid ${tierBorder}`,
              }}
            >
              <div
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "100px",
                  backgroundColor: tierColor,
                  marginRight: "9px",
                  display: "flex",
                }}
              />
              <span
                style={{
                  color: tierColor,
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  display: "flex",
                }}
              >
                {tierLabel} Tier
              </span>
            </div>
          </div>

          {/* ── Vertical divider with diamond ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              flexShrink: 0,
              alignSelf: "stretch",
              paddingTop: "30px",
              paddingBottom: "30px",
            }}
          >
            <div
              style={{
                width: "1px",
                flex: 1,
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.22) 100%)",
                display: "flex",
              }}
            />
            <div
              style={{
                width: "6px",
                height: "6px",
                backgroundColor: accentColor,
                transform: "rotate(45deg)",
                opacity: 0.6,
                display: "flex",
              }}
            />
            <div
              style={{
                width: "1px",
                flex: 1,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)",
                display: "flex",
              }}
            />
          </div>

          {/* ── RIGHT column: rank ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: "20px",
              flex: "1 1 0",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={oscarDataUrl}
              alt="Award"
              style={{
                height: `${trophyHeight}px`,
                width: `${trophyWidth}px`,
                objectFit: "contain",
                display: "flex",
                flexShrink: 0,
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "6px",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.38em",
                  textTransform: "uppercase",
                  display: "flex",
                }}
              >
                Ranked
              </span>
              <span
                style={{
                  color: rankColor,
                  fontSize: `${rankFontSize}px`,
                  fontWeight: 800,
                  letterSpacing: "-0.06em",
                  lineHeight: 1.05,
                  display: "flex",
                  textShadow: `0 0 48px ${rankGlow}`,
                  paddingBottom: "3px",
                }}
              >
                {rankDisplay}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  display: "flex",
                  marginTop: "5px",
                }}
              >
                of 80,000+ OSS organizations
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 64px",
            height: "76px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            backgroundColor: "rgba(0,0,0,0.35)",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "100px",
                backgroundColor: "#3ECF8E",
                boxShadow: "0 0 10px #3ECF8Eaa",
                display: "flex",
              }}
            />
            <span
              style={{
                color: "rgba(255,255,255,0.68)",
                fontSize: "17px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              osscar.dev
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={supabaseDataUrl}
              alt="Supabase"
              style={{ height: "30px", opacity: 0.75 }}
            />
            <span
              style={{
                color: "rgba(255,255,255,0.28)",
                fontSize: "15px",
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
              style={{ height: "32px", opacity: 0.78 }}
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
