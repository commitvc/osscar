import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { findOrgBySlug } from "@/lib/data";
import {
  getInterBold,
  readPublicAsBase64,
  fetchImageAsDataUrl,
} from "@/lib/og-helpers";
import { QUARTER_LABEL } from "@/lib/config";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "+5.9k", "+1.2M", "+240" */
function formatDelta(start: number | null, end: number | null): string | null {
  if (start == null || end == null) return null;
  const delta = end - start;
  const abs = Math.abs(delta);
  let value: number;
  let suffix = "";
  if (abs >= 1_000_000) {
    value = delta / 1_000_000;
    suffix = "M";
  } else if (abs >= 1_000) {
    value = delta / 1_000;
    suffix = "k";
  } else {
    value = delta;
  }
  let str = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
  if (str.endsWith(".0")) str = str.slice(0, -2);
  const sign = delta > 0 ? "+" : "";
  return `${sign}${str}${suffix}`;
}

/** Rank display logic for the share card: #1-10 with medal, Top 25/50/100 otherwise. */
function getRankMeta(rank: number) {
  if (rank === 1) return { label: "#1", color: "#F4C430", isTop: false };
  if (rank === 2) return { label: "#2", color: "#D7D7D7", isTop: false };
  if (rank === 3) return { label: "#3", color: "#CD7F32", isTop: false };
  if (rank <= 10) return { label: `#${rank}`, color: "#FFFFFF", isTop: false };
  if (rank <= 25) return { label: "25", color: "#FFFFFF", isTop: true };
  if (rank <= 50) return { label: "50", color: "#D0D0D0", isTop: true };
  if (rank <= 100) return { label: "100", color: "#AEAEAE", isTop: true };
  return { label: `${rank}`, color: "#AEAEAE", isTop: false };
}

/** Scale project name font-size so it never overflows the left column.
 *  Column content area after logo + gap is ~330px, so we ladder down aggressively. */
function getNameFontSize(name: string): number {
  const len = name.length;
  if (len <= 8) return 62;
  if (len <= 11) return 50;
  if (len <= 14) return 40;
  if (len <= 18) return 32;
  if (len <= 24) return 26;
  if (len <= 32) return 22;
  return 18;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.toLowerCase() ?? "";

  const org = findOrgBySlug(slug);
  if (!org) return new Response("Not found", { status: 404 });

  const isScaling = org.division === "scaling";
  const rank: number = org.division_rank;
  const tierLabel = isScaling ? "Scaling tier" : "Emerging tier";

  const name = org.owner_name;
  const logoUrl = org.owner_logo;

  // Static assets
  const supabaseDataUrl = readPublicAsBase64(
    "supabase-logo-wordmark--dark.png",
    "image/png"
  );
  const rrwDataUrl = readPublicAsBase64("brand-rrw.png", "image/png");
  const osscarIconDataUrl = readPublicAsBase64("osscar-icon.png", "image/png");

  const orgLogoDataUrl = logoUrl ? await fetchImageAsDataUrl(logoUrl) : null;

  const fontData = await getInterBold();

  const { label: rankLabel, color: rankColor, isTop } = getRankMeta(rank);
  const nameFontSize = getNameFontSize(name);
  // Big rank font scales down a bit when the number is longer.
  const rankFontSize = isTop
    ? rankLabel.length >= 3
      ? 150
      : 170
    : 180;

  // Deltas (may be null)
  const starsDelta = formatDelta(
    org.github_stars_start,
    org.github_stars_end
  );
  const contribDelta = formatDelta(
    org.github_contributors_start,
    org.github_contributors_end
  );
  const downloadsDelta = formatDelta(
    org.package_downloads_start,
    org.package_downloads_end
  );

  const hasStats = !!(starsDelta || contribDelta || downloadsDelta);

  // Tier chip palette — brand green for both (matches design system)
  const chipBorder = "rgba(62,207,142,0.35)";
  const chipBg = "rgba(62,207,142,0.10)";
  const chipText = "#3ECF8E";

  // Corner crosshair helper
  const CORNER = 18;
  function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
    const top = pos === "tl" || pos === "tr";
    const left = pos === "tl" || pos === "bl";
    return (
      <div
        style={{
          position: "absolute",
          ...(top ? { top: "12px" } : { bottom: "12px" }),
          ...(left ? { left: "12px" } : { right: "12px" }),
          width: `${CORNER}px`,
          height: `${CORNER}px`,
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            ...(top ? { top: 0 } : { bottom: 0 }),
            ...(left ? { left: 0 } : { right: 0 }),
            width: `${CORNER}px`,
            height: "1px",
            backgroundColor: "rgba(255,255,255,0.12)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            ...(top ? { top: 0 } : { bottom: 0 }),
            ...(left ? { left: 0 } : { right: 0 }),
            width: "1px",
            height: `${CORNER}px`,
            backgroundColor: "rgba(255,255,255,0.12)",
            display: "flex",
          }}
        />
      </div>
    );
  }

  // One stat slot — fixed 1/3 width so positions stay stable when some stats are missing
  function StatSlot({
    icon,
    value,
    showDivider,
  }: {
    icon?: React.ReactNode;
    value?: string;
    showDivider?: boolean;
  }) {
    const hasValue = value != null;
    return (
      <div
        style={{
          width: "33.333%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "11px",
          borderRight: showDivider ? "1px solid #2A2A2A" : "0",
          padding: "0 12px",
        }}
      >
        {hasValue && icon}
        {hasValue && (
          <span
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#EDEDED",
              letterSpacing: "-0.015em",
              lineHeight: 1,
              display: "flex",
            }}
          >
            {value}
          </span>
        )}
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
          backgroundColor: "#1c1c1c",
          fontFamily: "Inter, sans-serif",
          position: "relative",
          color: "#EDEDED",
          border: "1px solid #1f1f1f",
        }}
      >
        {/* Atmospheric accent on the rank side */}
        {/* Corner crosshairs */}
        <Corner pos="tl" />
        <Corner pos="tr" />
        <Corner pos="bl" />
        <Corner pos="br" />

        {/* ── Top bar with OSSCAR pill ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "74px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 20px",
              border: "1px solid #2A2A2A",
              borderRadius: "999px",
              backgroundColor: "rgba(255,255,255,0.02)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={osscarIconDataUrl}
              alt=""
              style={{ height: "18px", width: "18px", display: "flex" }}
            />
            <span
              style={{
                fontSize: "14px",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "#A0A0A0",
                fontWeight: 600,
                display: "flex",
              }}
            >
              OSSCAR
            </span>
            <span
              style={{
                color: "#6F6F6F",
                opacity: 0.55,
                display: "flex",
              }}
            >
              ·
            </span>
            <span
              style={{
                fontSize: "14px",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "#A0A0A0",
                fontWeight: 600,
                display: "flex",
              }}
            >
              {QUARTER_LABEL}
            </span>
          </div>
        </div>

        {/* ── Body: two columns with divider ── */}
        <div
          style={{
            display: "flex",
            flex: 1,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* LEFT — project identity */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "28px",
              padding: "0 64px 0 72px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              {orgLogoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgLogoDataUrl}
                  alt={name}
                  style={{
                    width: "104px",
                    height: "104px",
                    borderRadius: "22px",
                    objectFit: "cover",
                    border: "1px solid #2A2A2A",
                    backgroundColor: "#181818",
                    display: "flex",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "104px",
                    height: "104px",
                    borderRadius: "22px",
                    backgroundColor: "#181818",
                    border: "1px solid #2A2A2A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.72)",
                    fontSize: "48px",
                    fontWeight: 800,
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: `${nameFontSize}px`,
                    fontWeight: 800,
                    color: "#EDEDED",
                    letterSpacing: "-0.035em",
                    lineHeight: 0.95,
                    maxWidth: "340px",
                    display: "flex",
                  }}
                >
                  {name}
                </span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                    padding: "7px 13px",
                    border: `1px solid ${chipBorder}`,
                    backgroundColor: chipBg,
                    borderRadius: "999px",
                    alignSelf: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "999px",
                      backgroundColor: chipText,
                      display: "flex",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: chipText,
                      display: "flex",
                    }}
                  >
                    {tierLabel}
                  </span>
                </div>
              </div>
            </div>

            <span
              style={{
                color: "#A0A0A0",
                fontSize: "16px",
                fontWeight: 500,
                lineHeight: 1.5,
                letterSpacing: "-0.005em",
                maxWidth: "440px",
                display: "flex",
              }}
            >
              Ranked among the fastest-growing open source organizations of {QUARTER_LABEL}
            </span>
          </div>

          {/* divider with centered brand dot */}
          <div
            style={{
              width: "7px",
              margin: "36px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <div
              style={{
                width: "1px",
                flex: 1,
                background:
                  "linear-gradient(180deg, transparent, rgba(255,255,255,0.09) 30%, rgba(255,255,255,0.09) 100%)",
                display: "flex",
              }}
            />
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "999px",
                backgroundColor: "#3ECF8E",
                boxShadow:
                  "0 0 0 4px rgba(62,207,142,0.14), 0 0 18px rgba(62,207,142,0.4)",
                display: "flex",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                width: "1px",
                flex: 1,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.09) 70%, transparent)",
                display: "flex",
              }}
            />
          </div>

          {/* RIGHT — rank + stats */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: "36px",
              padding: "0 72px 0 64px",
            }}
          >
            {/* Rank block */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {isTop ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "28px",
                      fontWeight: 700,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.55)",
                      display: "flex",
                      lineHeight: 1,
                    }}
                  >
                    TOP
                  </span>
                  <span
                    style={{
                      fontSize: `${rankFontSize}px`,
                      fontWeight: 800,
                      letterSpacing: "-0.06em",
                      lineHeight: 1,
                      color: rankColor,
                      display: "flex",
                      paddingBottom: "6px",
                    }}
                  >
                    {rankLabel}
                  </span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "68px",
                      fontWeight: 600,
                      color: "#6F6F6F",
                      letterSpacing: "-0.02em",
                      marginRight: "8px",
                      lineHeight: 1,
                      display: "flex",
                    }}
                  >
                    #
                  </span>
                  <span
                    style={{
                      fontSize: `${rankFontSize}px`,
                      fontWeight: 800,
                      letterSpacing: "-0.065em",
                      lineHeight: 1,
                      color: rankColor,
                      display: "flex",
                      paddingBottom: "6px",
                    }}
                  >
                    {rankLabel.replace("#", "")}
                  </span>
                </div>
              )}
              <span
                style={{
                  color: "#A0A0A0",
                  fontSize: "16px",
                  fontWeight: 500,
                  lineHeight: 1.4,
                  textAlign: "center",
                  display: "flex",
                }}
              >
                of 40,000+ Open Source GitHub organizations
              </span>
            </div>

            {/* Stats — always 3 fixed-width slots so positions are stable
                whether the org has 1, 2 or 3 metrics */}
            {hasStats && (
              <div
                style={{
                  display: "flex",
                  borderTop: "1px solid #2A2A2A",
                  paddingTop: "22px",
                  width: "500px",
                }}
              >
                <StatSlot
                  icon={
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A0A0A0"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15 9 22 9.5 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.5 9 9" />
                    </svg>
                  }
                  value={starsDelta ?? undefined}
                  showDivider={!!starsDelta && !!contribDelta}
                />
                <StatSlot
                  icon={
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A0A0A0"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="9" cy="8" r="3.2" />
                      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                      <circle cx="17" cy="7" r="2.6" />
                      <path d="M15.5 13.2c3.2.6 5.5 3.1 5.5 6.3" />
                    </svg>
                  }
                  value={contribDelta ?? undefined}
                  showDivider={!!contribDelta && !!downloadsDelta}
                />
                <StatSlot
                  icon={
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#A0A0A0"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3v12" />
                      <polyline points="7 10 12 15 17 10" />
                      <path d="M4 19h16" />
                    </svg>
                  }
                  value={downloadsDelta ?? undefined}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            height: "72px",
            padding: "0 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #2A2A2A",
            backgroundColor: "rgba(10,10,10,0.4)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={osscarIconDataUrl}
              alt=""
              style={{ height: "18px", opacity: 0.6 }}
            />
            <span
              style={{
                color: "#A0A0A0",
                letterSpacing: "0.22em",
                fontWeight: 600,
                fontSize: "12px",
                display: "flex",
              }}
            >
              OSSCAR.DEV
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={supabaseDataUrl}
              alt="supabase"
              style={{ height: "22px", opacity: 0.9 }}
            />
            <span style={{ color: "#6F6F6F", fontSize: "14px", display: "flex" }}>
              ×
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                // Nudge the >commit group down so the text bottom sits on the
                // same baseline as the "supabase" wordmark inside the PNG
                // (the wordmark text has ~2–3px padding at the bottom of its
                // image box, while the rendered >commit text is vertically
                // centered within its own line box).
                transform: "translateY(4px)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rrwDataUrl}
                alt=""
                style={{ height: "20px", display: "flex" }}
              />
              <span
                style={{
                  color: "#EDEDED",
                  fontWeight: 700,
                  fontSize: "14px",
                  letterSpacing: "-0.01em",
                  display: "flex",
                }}
              >
                &gt;commit
              </span>
            </div>
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
