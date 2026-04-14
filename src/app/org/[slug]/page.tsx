import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Star,
  Users,
  Package,
  Github,
  Globe,
  ChevronLeft,
  ArrowUpRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrgLogo } from "@/components/org-logo";
import { GrowthChart, type MetricConfig } from "@/components/growth-chart";
import { ShareButton } from "@/components/share-button";
import { EmbedButton } from "@/components/embed-button";
import { RepoTable } from "@/components/repo-table";
import {
  getAbove1000,
  getBelow1000,
  getFrontendData,
  extractSlug,
} from "@/lib/data";
import {
  computeScore,
  formatScore,
  formatCompact,
  formatGrowthRate,
  cn,
} from "@/lib/utils";
import type { OrgEntry, FrontendOrgData, Tier, TimeSeriesPoint } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ slug: string }>;
};

// ─── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const [above, below] = [getAbove1000(), getBelow1000()];
  return [...above, ...below]
    .filter((o) => o.owner_url)
    .map((o) => ({ slug: extractSlug(o.owner_url) ?? "" }))
    .filter((p) => p.slug);
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();
  const above = getAbove1000();
  const below = getBelow1000();
  const rankingOrg =
    above.find((o) => extractSlug(o.owner_url) === slug) ??
    below.find((o) => extractSlug(o.owner_url) === slug);

  if (!rankingOrg) return { title: "OSS Growth Index" };

  const score = computeScore(rankingOrg);
  const ogImageUrl = `/api/og?slug=${slug}`;
  return {
    title: `${rankingOrg.owner_name} — OSS Growth Index Q1 2026`,
    description: `${rankingOrg.owner_name} on the OSS Growth Index Q1 2026 with a composite score of ${formatScore(score)}.`,
    openGraph: {
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl],
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRankColor(rank: number): string {
  if (rank === 1) return "#F4C430";
  if (rank <= 3) return "#E8A020";
  if (rank <= 10) return "#3ECF8E";
  return "rgba(255,255,255,0.7)";
}

function getRankGlow(rank: number): string {
  if (rank <= 3)
    return "0 0 60px rgba(244,196,48,0.25), 0 0 20px rgba(244,196,48,0.12)";
  if (rank <= 10)
    return "0 0 60px rgba(62,207,142,0.15), 0 0 20px rgba(62,207,142,0.08)";
  return "none";
}

type SignalConfig = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  end: number | null;
  start: number | null;
  rate: number | null;
  percentile: number | null;
};

function buildSignals(org: OrgEntry): SignalConfig[] {
  return [
    {
      key: "github_stars",
      label: "GitHub Stars",
      icon: Star,
      color: "#F4C430",
      end: org.github_stars_end,
      start: org.github_stars_start,
      rate: org.github_stars_growth_rate,
      percentile: org.github_stars_growth_percentile,
    },
    {
      key: "github_contributors",
      label: "Contributors",
      icon: Users,
      color: "#60A5FA",
      end: org.github_contributors_end,
      start: org.github_contributors_start,
      rate: org.github_contributors_growth_rate,
      percentile: org.github_contributors_growth_percentile,
    },
    {
      key: "package_downloads",
      label: "Package Downloads",
      icon: Package,
      color: "#FB923C",
      end: org.package_downloads_end,
      start: org.package_downloads_start,
      rate: org.package_downloads_growth_rate,
      percentile: org.package_downloads_growth_percentile,
    },
  ];
}

// ─── Padding thresholds (must match methodology) ─────────────────────────────

const PADDING_THRESHOLDS: Record<string, { above_1000: number; below_1000: number }> = {
  github_stars:        { below_1000: 100, above_1000: 1_000 },
  github_contributors: { below_1000: 5,   above_1000: 10 },
  package_downloads:   { below_1000: 100, above_1000: 1_000 },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalCard({
  signal,
  tier,
}: {
  signal: SignalConfig;
  tier: Tier;
}) {
  const hasData = signal.end != null;
  const Icon = signal.icon;
  const isPositive = (signal.rate ?? 0) >= 0;

  return (
    <div
      className={cn(
        "bg-card rounded-xl border p-5 flex flex-col gap-4 transition-colors",
        hasData
          ? "border-white/10 hover:border-white/20"
          : "border-white/5 opacity-35"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-muted-foreground/50 shrink-0" />
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/60">
          {signal.label}
        </span>
      </div>

      {/* Value + methodology rate + real growth note */}
      {(() => {
        const padding = PADDING_THRESHOLDS[signal.key]?.[tier];
        const isLowBaseline =
          signal.rate != null &&
          signal.start != null &&
          padding != null &&
          signal.start < padding;

        const realRate =
          signal.start == null || signal.start === 0
            ? signal.end != null && signal.end > 0
              ? Infinity
              : null
            : signal.end != null
              ? (signal.end - signal.start) / signal.start
              : null;
        const realLabel =
          realRate === Infinity
            ? "+∞"
            : realRate != null
              ? `+${realRate.toFixed(1)}×`
              : null;

        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="font-mono text-3xl font-bold text-foreground tabular-nums leading-none">
                {hasData ? formatCompact(signal.end) : "—"}
              </span>
              {signal.rate != null ? (
                <span
                  className={cn(
                    "font-mono text-sm font-semibold px-2 py-0.5 rounded-sm tabular-nums",
                    isPositive ? "bg-green/15 text-green" : "bg-brand/15 text-brand"
                  )}
                >
                  {formatGrowthRate(signal.rate)}
                </span>
              ) : null}
            </div>
            {isLowBaseline && realLabel && (
              <span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground/40 leading-tight">
                Real growth: <span className="font-semibold text-green">{realLabel}</span>
                {" "}({formatCompact(signal.start)} → {formatCompact(signal.end)}). Min baseline {formatCompact(padding!)} used for ranking.
              </span>
            )}
          </div>
        );
      })()}

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OrgPage({ params }: Props) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();

  const above = getAbove1000();
  const below = getBelow1000();
  const frontendData = getFrontendData();

  const aboveOrg = above.find((o) => extractSlug(o.owner_url) === slug);
  const belowOrg = below.find((o) => extractSlug(o.owner_url) === slug);
  const rankingOrg: OrgEntry | undefined = aboveOrg ?? belowOrg;

  const frontendOrg: FrontendOrgData | undefined = frontendData.find(
    (o) => extractSlug(o.github_url) === slug
  );

  if (!rankingOrg && !frontendOrg) notFound();

  // Rank + tier
  const tier: Tier = aboveOrg ? "above_1000" : "below_1000";
  const tierData = tier === "above_1000" ? above : below;
  const rankIndex = tierData.findIndex(
    (o) => extractSlug(o.owner_url) === slug
  );
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  // Score + signals
  const score = rankingOrg ? computeScore(rankingOrg) : 0;
  const signals = rankingOrg ? buildSignals(rankingOrg) : [];
  const hasAnySignal = signals.some((s) => s.end != null);

  // Display metadata
  const name = rankingOrg?.owner_name ?? frontendOrg?.name ?? slug;
  const description = rankingOrg?.owner_description ?? frontendOrg?.description ?? null;
  const logoUrl = rankingOrg?.owner_logo ?? frontendOrg?.logo_url ?? null;
  const githubUrl = rankingOrg?.owner_url ?? frontendOrg?.github_url ?? null;
  const homepageUrl = rankingOrg?.homepage_url ?? frontendOrg?.homepage_url ?? null;

  const rankColor = rank ? getRankColor(rank) : "rgba(255,255,255,0.5)";
  const rankGlow = rank ? getRankGlow(rank) : "none";
  const tierLabel = tier === "above_1000" ? "Scaling" : "Emerging";

  // If the first data point is more than 14 days after the quarter start,
  // the signal didn't exist at the start of the quarter — prepend a zero so
  // the chart shows the ramp-up from nothing instead of starting mid-air.
  function withLeadingZero(data: TimeSeriesPoint[], quarterStart: string): TimeSeriesPoint[] {
    if (data.length === 0) return data;
    const firstPt = new Date(data[0].date).getTime();
    const qStart = new Date(quarterStart).getTime();
    if (firstPt <= qStart) return data;
    const zeroPrevDate = new Date(firstPt - 7 * 86_400_000).toISOString().split("T")[0];
    // Only prepend if the zero point falls within the quarter
    if (zeroPrevDate < quarterStart) return data;
    return [{ date: zeroPrevDate, value: 0 }, ...data];
  }

  const quarterStart = rankingOrg?.quarter_start ?? "2026-01-01";

  // Chart metrics
  const BRAND = "#3ECF8E";
  const chartMetrics: MetricConfig[] = frontendOrg
    ? [
        {
          key: "stars",
          label: "Stars",
          data: withLeadingZero(frontendOrg.github_stars_weekly, quarterStart),
          color: BRAND,
          periodLabel: "cumulative stars",
        },
        {
          key: "contributors",
          label: "Contributors",
          data: withLeadingZero(frontendOrg.github_contributors_weekly, quarterStart),
          color: BRAND,
          periodLabel: "cumulative contributors",
        },
        {
          key: "npm",
          label: "NPM",
          data: withLeadingZero(frontendOrg.npm_weekly, quarterStart),
          color: BRAND,
          periodLabel: "weekly downloads",
        },
        {
          key: "pypi",
          label: "PyPI",
          data: withLeadingZero(frontendOrg.pypi_weekly, quarterStart),
          color: BRAND,
          periodLabel: "weekly downloads",
        },
        {
          key: "cargo",
          label: "Cargo",
          data: withLeadingZero(frontendOrg.cargo_weekly, quarterStart),
          color: BRAND,
          periodLabel: "weekly downloads",
        },
      ]
    : [];

  const hasChartData = chartMetrics.some((m) => m.data.length > 0);
  const hasRepos = !!frontendOrg && frontendOrg.repositories.length > 0;

  return (
    <>
      <SiteHeader />

      <main className="flex-1 min-h-screen">
        {/* Back nav */}
        <div className="border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 h-10 flex items-center">
            <Link
              href="/"
              className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors group"
            >
              <ChevronLeft
                size={13}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              All Rankings
            </Link>
          </div>
        </div>

        {/* Hero */}
        <section className="border-b border-white/10 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 55% 90% at 90% 50%, rgba(62,207,142,0.04) 0%, transparent 65%)",
            }}
          />

          <div className="max-w-6xl mx-auto px-6 py-12 relative">
            <div className="flex flex-col lg:flex-row gap-10 lg:items-start">
              {/* Org identity */}
              <div className="flex-1 space-y-6 min-w-0">
                <div className="flex items-start gap-4">
                  <OrgLogo
                    logoUrl={logoUrl}
                    name={name}
                    size={52}
                    className="rounded-xl mt-1 shrink-0"
                  />
                  <div className="min-w-0">
                    <h1 className="font-bold text-3xl lg:text-4xl text-foreground tracking-tight leading-tight">
                      {name}
                    </h1>
                    <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                      <span
                        className="font-mono text-[0.6rem] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-sm border border-green/30 bg-green/10 text-green"
                      >
                        {tierLabel}
                      </span>
                      <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/40">
                        Q1 2026
                      </span>
                    </div>
                  </div>
                </div>

                {description && (
                  <p className="text-sm text-muted-foreground/75 leading-relaxed max-w-xl">
                    {description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {githubUrl && (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/4 hover:bg-white/8 transition-all font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground/70 hover:text-foreground group"
                    >
                      <Github size={12} />
                      GitHub
                      <ArrowUpRight
                        size={10}
                        className="opacity-40 group-hover:opacity-60 transition-opacity"
                      />
                    </a>
                  )}
                  {homepageUrl && (
                    <a
                      href={
                        homepageUrl.startsWith("http")
                          ? homepageUrl
                          : `https://${homepageUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/4 hover:bg-white/8 transition-all font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground/70 hover:text-foreground group"
                    >
                      <Globe size={12} />
                      Website
                      <ArrowUpRight
                        size={10}
                        className="opacity-40 group-hover:opacity-60 transition-opacity"
                      />
                    </a>
                  )}
                </div>
              </div>

              {/* Rank + share panel */}
              {rank && (
                <div className="flex flex-col items-center gap-5 lg:pl-12 lg:border-l lg:border-white/10 shrink-0 w-full lg:w-[260px]">
                  <div className="text-center w-full">
                    <div
                      className="font-mono font-bold leading-none tabular-nums select-none"
                      style={{
                        fontSize: "clamp(60px, 10vw, 96px)",
                        color: rankColor,
                        textShadow: rankGlow,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      #{rank}
                    </div>
                    <div className="font-mono text-[0.55rem] uppercase tracking-[0.25em] text-muted-foreground/35 mt-2">
                      rank · {tierLabel}
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4 w-full flex gap-2">
                    <ShareButton
                      name={name}
                      rank={rank}
                      tierLabel={tierLabel}
                      slug={slug}
                    />
                    <EmbedButton name={name} slug={slug} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">

          {/* Signal breakdown */}
          {hasAnySignal && (
            <section className="space-y-5">
              <div className="flex items-baseline gap-3">
                <h2 className="font-bold text-base text-foreground tracking-tight">
                  Signal Breakdown
                </h2>
                <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/35">
                  Q1 2026
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {signals.map((signal) => (
                  <SignalCard
                    key={signal.key}
                    signal={signal}
                    tier={tier}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Growth chart */}
          {hasChartData && (
            <section className="space-y-5">
              <div className="flex items-baseline gap-3">
                <h2 className="font-bold text-base text-foreground tracking-tight">
                  Growth Over Time
                </h2>
                <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/35">
                  2026
                </span>
              </div>
              <div className="bg-card border border-white/10 rounded-xl p-6">
                <GrowthChart metrics={chartMetrics} quarterStart={quarterStart} quarterEnd="2026-03-31" />
              </div>
            </section>
          )}

          {/* Repositories */}
          {hasRepos && (
            <section className="space-y-5">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-bold text-base text-foreground tracking-tight">
                    Repositories
                  </h2>
                  <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/35">
                    {frontendOrg.repositories.length} public repos
                  </span>
                </div>
                {githubUrl && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                  >
                    View on GitHub
                    <ArrowUpRight size={10} />
                  </a>
                )}
              </div>
              <RepoTable repos={frontendOrg.repositories} />
            </section>
          )}

          {/* Methodology */}
          <section className="border-t border-white/5 pt-10">
            <div className="flex flex-col sm:flex-row gap-6 sm:items-start sm:justify-between">
              <div className="space-y-2 max-w-lg">
                <a href="/methodology" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors font-mono">
                  Read the methodology →
                </a>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                <span className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground/30">
                  Tier
                </span>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    "text-green"
                  )}
                >
                  {tierLabel} ·{" "}
                  {tier === "above_1000" ? "≥1,000 stars" : "<1,000 stars"}
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
