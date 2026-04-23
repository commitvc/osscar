import {
  Button,
  Column,
  Img,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { COLORS, EmailFrame, MONO_STACK, SITE_URL } from "./_frame";

/**
 * One-page "your OSSCAR score" email.
 *
 * Designed to mirror the organization detail page at
 *   frontend/src/app/org/[slug]/page.tsx
 * — same card surface (#262626), same link pills, same rank-color palette,
 * same division badge, same metric-card structure.
 */

export type ScoreReportEmailProps = {
  quarterLabel: string;
  division: "emerging" | "scaling";
  divisionRank: number;
  divisionSize: number;

  ownerLogin: string;
  ownerName: string | null;
  ownerLogo: string | null;
  ownerDescription: string | null;
  ownerUrl: string | null;
  homepageUrl: string | null;

  stars: Metric;
  contributors: Metric;
  downloads: Metric;
};

type Metric = {
  value: number | null;
  /** Methodology growth rate (e.g. 0.25 → "+0.3×"). */
  growthRate: number | null;
};

// ─── Helpers (inlined; email bundle is self-contained) ───────────────────────

function formatCompact(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return v % 1 === 0 ? `${v}M` : `${v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return v % 1 === 0 ? `${v}K` : `${v.toFixed(1)}K`;
  }
  return String(Math.round(n));
}

function formatGrowthRate(rate: number | null): string {
  if (rate == null) return "—";
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}×`;
}

function rankColor(rank: number): string {
  if (rank === 1) return COLORS.gold;
  if (rank <= 3) return COLORS.bronze;
  if (rank <= 10) return COLORS.brand;
  return "rgba(255,255,255,0.70)";
}

function initialsDataUrl(seed: string): string {
  const letter = (seed?.[0] ?? "?").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52"><rect width="52" height="52" rx="12" fill="#1f1f1f"/><text x="50%" y="50%" dy=".1em" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#fafafa">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ─── Inline icon SVGs (lucide-react does not render in email clients) ──────

const StarIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const UsersIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const PackageIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.27 6.96 12 12.01l8.73-5.05" />
    <path d="M12 22.08V12" />
  </svg>
);

const GithubIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ display: "block" }}>
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.11.793-.26.793-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.8.57C20.565 21.795 24 17.3 24 12c0-6.627-5.373-12-12-12" />
  </svg>
);

const GlobeIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ArrowUpRightIcon = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", opacity: 0.5 }}>
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

// ─── Sub-components ──────────────────────────────────────────────────────────

function LinkPill({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-block",
        padding: "6px 10px",
        marginRight: 8,
        marginBottom: 6,
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.white4,
        fontFamily: MONO_STACK,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: COLORS.fgMuted,
        textDecoration: "none",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          display: "inline-block",
          verticalAlign: "middle",
          marginRight: 6,
        }}
      >
        {icon}
      </span>
      <span style={{ verticalAlign: "middle" }}>{label}</span>
      <span
        style={{
          display: "inline-block",
          verticalAlign: "middle",
          marginLeft: 5,
        }}
      >
        {ArrowUpRightIcon}
      </span>
    </Link>
  );
}

function MetricCard({
  label,
  value,
  growth,
  iconSvg,
}: {
  label: string;
  value: number | null;
  growth: number | null;
  iconSvg: React.ReactNode;
}) {
  const hasData = value != null;
  const isPositive = (growth ?? 0) >= 0;
  const pillBg = growth == null ? "transparent" : isPositive ? COLORS.brandPillBg : COLORS.dangerDim;
  const pillFg = growth == null ? COLORS.fgSubtle : isPositive ? COLORS.brand : COLORS.danger;

  return (
    <td
      className="osscar-metric-card"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${hasData ? COLORS.border : COLORS.borderSoft}`,
        borderRadius: 12,
        padding: 18,
        verticalAlign: "top",
        width: "33.333%",
        opacity: hasData ? 1 : 0.45,
      }}
    >
      {/* Header: icon + label */}
      <div style={{ lineHeight: 1, marginBottom: 14 }}>
        <span
          style={{
            display: "inline-block",
            verticalAlign: "middle",
            marginRight: 6,
            color: COLORS.fgFaint,
          }}
        >
          {iconSvg}
        </span>
        <span
          style={{
            verticalAlign: "middle",
            fontFamily: MONO_STACK,
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: COLORS.fgSubtle,
          }}
        >
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontFamily: MONO_STACK,
          fontSize: 26,
          fontWeight: 700,
          color: COLORS.fgStrong,
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        {formatCompact(value)}
      </div>

      {/* Growth pill */}
      {growth != null && (
        <div style={{ marginTop: 10 }}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 7px",
              borderRadius: 4,
              backgroundColor: pillBg,
              color: pillFg,
              fontFamily: MONO_STACK,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {formatGrowthRate(growth)}
          </span>
        </div>
      )}
    </td>
  );
}

// ─── Email ───────────────────────────────────────────────────────────────────

export default function ScoreReportEmail(props: ScoreReportEmailProps) {
  const {
    quarterLabel,
    division,
    divisionRank,
    ownerLogin,
    ownerName,
    ownerLogo,
    ownerDescription,
    ownerUrl,
    homepageUrl,
    stars,
    contributors,
    downloads,
  } = props;
  // divisionSize is still accepted for forward-compat (the Supabase row and
  // the API pass it through) but we no longer display the "out of N" phrase.

  const displayName = ownerName?.trim() || ownerLogin;
  const rankHex = rankColor(divisionRank);
  const divisionLabel = division === "scaling" ? "Scaling" : "Emerging";

  return (
    <EmailFrame
      preview={`#${divisionRank} in ${divisionLabel} · ${displayName} on the OSSCAR ${quarterLabel} index`}
      quarterLabel={quarterLabel}
    >
      {/* ── Hero: identity + rank ───────────────────────────────────────── */}
      <Section style={{ marginBottom: 24 }}>
        <Row>
          {/* Identity */}
          <Column
            className="osscar-hero-cell"
            style={{ verticalAlign: "top", paddingRight: 16 }}
          >
            <Row>
              <Column style={{ width: 52, verticalAlign: "top", paddingRight: 14 }}>
                <Img
                  src={ownerLogo ?? initialsDataUrl(displayName)}
                  width={52}
                  height={52}
                  alt={displayName}
                  style={{
                    borderRadius: 12,
                    display: "block",
                    border: `1px solid ${COLORS.border}`,
                  }}
                />
              </Column>
              <Column style={{ verticalAlign: "top" }}>
                <Text
                  className="osscar-hero-name"
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.fgStrong,
                    lineHeight: "28px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {displayName}
                </Text>
                <div style={{ marginTop: 8 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 3,
                      border: `1px solid ${COLORS.brandBorder}`,
                      backgroundColor: COLORS.brandDim,
                      color: COLORS.brand,
                      fontFamily: MONO_STACK,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      lineHeight: "16px",
                    }}
                  >
                    {divisionLabel}
                  </span>
                </div>
              </Column>
            </Row>
          </Column>

          {/* Rank */}
          <Column
            className="osscar-hero-cell osscar-hero-rank"
            style={{
              verticalAlign: "top",
              textAlign: "right",
              width: 120,
              paddingLeft: 16,
              borderLeft: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              className="osscar-hero-rank-num"
              style={{
                fontFamily: MONO_STACK,
                fontSize: 44,
                fontWeight: 700,
                color: rankHex,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              #{divisionRank.toLocaleString("en-US")}
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: MONO_STACK,
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: COLORS.fgFaint,
              }}
            >
              rank · {divisionLabel}
            </div>
          </Column>
        </Row>

        {/* Description */}
        {ownerDescription && (
          <Text
            style={{
              marginTop: 18,
              marginBottom: 0,
              fontSize: 13,
              lineHeight: "20px",
              color: COLORS.fgMuted,
            }}
          >
            {ownerDescription}
          </Text>
        )}

        {/* Link pills */}
        {(ownerUrl || homepageUrl) && (
          <div style={{ marginTop: 14 }}>
            {ownerUrl && (
              <LinkPill href={ownerUrl} icon={GithubIcon} label="GitHub" />
            )}
            {homepageUrl && (
              <LinkPill
                href={
                  homepageUrl.startsWith("http")
                    ? homepageUrl
                    : `https://${homepageUrl}`
                }
                icon={GlobeIcon}
                label="Website"
              />
            )}
          </div>
        )}

        {/* Rank subtext */}
        <Text
          style={{
            margin: "18px 0 0",
            fontSize: 12,
            color: COLORS.fgSubtle,
          }}
        >
          Ranked #{divisionRank.toLocaleString("en-US")} in the{" "}
          <span style={{ color: COLORS.brand, fontWeight: 600 }}>
            {divisionLabel}
          </span>{" "}
          division for {quarterLabel}.
        </Text>
      </Section>

      {/* ── Signal breakdown ────────────────────────────────────────────── */}
      <Section style={{ marginBottom: 24 }}>
        <Text
          style={{
            margin: "0 0 14px",
            fontSize: 14,
            fontWeight: 700,
            color: COLORS.fgStrong,
            letterSpacing: "-0.01em",
          }}
        >
          Signal Breakdown
          <span
            style={{
              marginLeft: 10,
              fontFamily: MONO_STACK,
              fontSize: 10,
              fontWeight: 400,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLORS.fgFaint,
            }}
          >
            {quarterLabel}
          </span>
        </Text>
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          className="osscar-metric-row"
          style={{ borderCollapse: "separate", borderSpacing: "8px 0" }}
        >
          <tbody>
            <tr>
              <MetricCard
                label="GitHub Stars"
                value={stars.value}
                growth={stars.growthRate}
                iconSvg={StarIcon}
              />
              <MetricCard
                label="Contributors"
                value={contributors.value}
                growth={contributors.growthRate}
                iconSvg={UsersIcon}
              />
              <MetricCard
                label="Pkg Downloads"
                value={downloads.value}
                growth={downloads.growthRate}
                iconSvg={PackageIcon}
              />
            </tr>
          </tbody>
        </table>
      </Section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <Section style={{ textAlign: "center", marginTop: 28, marginBottom: 4 }}>
        <Button
          href={`${SITE_URL}/`}
          style={{
            backgroundColor: COLORS.brand,
            color: COLORS.brandFg,
            fontSize: 13,
            fontWeight: 600,
            padding: "11px 20px",
            borderRadius: 8,
            textDecoration: "none",
            display: "inline-block",
            letterSpacing: "0.01em",
          }}
        >
          Go to the ranking →
        </Button>
        <Text
          style={{
            margin: "14px 0 0",
            fontSize: 11,
            lineHeight: "18px",
            color: COLORS.fgSubtle,
          }}
        >
          Growth rates use our padded-baseline methodology.{" "}
          <Link
            href={`${SITE_URL}/methodology`}
            style={{ color: COLORS.fgMuted, textDecoration: "underline" }}
          >
            Read more
          </Link>
          .
        </Text>
      </Section>
    </EmailFrame>
  );
}

// Preview data for `react-email dev`
ScoreReportEmail.PreviewProps = {
  quarterLabel: "Q1 2026",
  division: "scaling",
  divisionRank: 42,
  divisionSize: 12_840,
  ownerLogin: "supabase",
  ownerName: "Supabase",
  ownerLogo: "https://avatars.githubusercontent.com/u/54469796?v=4",
  ownerDescription:
    "The open-source Firebase alternative — Postgres, Auth, Storage, and Edge Functions.",
  ownerUrl: "https://github.com/supabase",
  homepageUrl: "https://supabase.com",
  stars: { value: 92_100, growthRate: 0.18 },
  contributors: { value: 2_410, growthRate: 0.21 },
  downloads: { value: 1_230_000, growthRate: 0.35 },
} satisfies ScoreReportEmailProps;
