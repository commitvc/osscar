import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Star,
  Users,
  Package,
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
import { GitHubIcon } from "@/components/github-icon";
import {
  findOrgBySlugForQuarter,
  getPublishedQuarters,
  getPublishedQuartersForOrg,
  resolveQuarter,
} from "@/lib/data";
import {
  computeScore,
  formatScore,
  formatCompact,
  cn,
} from "@/lib/utils";
import { calculateRankingGrowthRate, formatGrowthMultiplier } from "@/lib/growth";
import { hrefWithQuarter } from "@/lib/quarter-url";
import { PADDING_THRESHOLDS, type MetricKey } from "@/lib/padding-thresholds";
import type { Org, Division } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ quarter?: string }>;
};

export const dynamic = "force-dynamic";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const slug = rawSlug.toLowerCase();
  const quarter = await resolveQuarter(resolvedSearchParams?.quarter);

  if (!quarter) return { title: { absolute: "OSSCAR" } };

  const org = await findOrgBySlugForQuarter(slug, quarter);

  if (!org) return { title: { absolute: "OSSCAR" } };

  const score = computeScore(org);
  const ogParams = new URLSearchParams({ slug });
  if (!quarter.is_current) ogParams.set("quarter", quarter.id);
  const ogImageUrl = `/api/og?${ogParams.toString()}`;
  return {
    title: { absolute: `${org.owner_name} — OSSCAR ${quarter.label}` },
    description: `${org.owner_name} on OSSCAR ${quarter.label} with a composite score of ${formatScore(score)}.`,
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
  key: MetricKey;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  end: number | null;
  start: number | null;
  rate: number | null;
  percentile: number | null;
};

function buildSignals(org: Org): SignalConfig[] {
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalCard({
  signal,
  division,
  sources,
}: {
  signal: SignalConfig;
  division: Division;
  sources?: string[];
}) {
  const hasData = signal.end != null;
  const Icon = signal.icon;
  const showRate = signal.rate != null && signal.rate > 0;

  return (
    <div
      data-testid={`signal-card-${signal.key}`}
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
          {sources && sources.length > 0 && (
            <>
              <span className="text-muted-foreground/25"> · </span>
              <span className="text-green/90">{sources.join(" · ")}</span>
            </>
          )}
        </span>
      </div>

      {/* Value + real growth rate + padding-for-ranking note */}
      {(() => {
        const padding = PADDING_THRESHOLDS[signal.key][division];
        const isLowBaseline =
          signal.start != null &&
          signal.end != null &&
          signal.start < padding;
        const rankingRate = isLowBaseline
          ? calculateRankingGrowthRate(signal.start, signal.end, padding)
          : null;
        const isEligibleAfterPadding =
          rankingRate != null &&
          rankingRate >= 0 &&
          signal.end != null &&
          signal.end >= padding;

        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="font-mono text-3xl font-bold text-foreground tabular-nums leading-none">
                {hasData ? formatCompact(signal.end) : "—"}
              </span>
              {showRate ? (
                <span className="font-mono text-sm font-semibold px-2 py-0.5 rounded-sm tabular-nums bg-green/15 text-green">
                  {formatGrowthMultiplier(signal.rate)}
                </span>
              ) : null}
            </div>
            {isLowBaseline && (
              <span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground/40 leading-tight">
                Actual: {formatCompact(signal.start)} → {formatCompact(signal.end)}.{" "}
                {isEligibleAfterPadding
                  ? <>Ranking: {formatCompact(padding)} → {formatCompact(signal.end)} ({formatGrowthMultiplier(rankingRate)}).</>
                  : <>Below the minimum ranking baseline of {formatCompact(padding)}.</>}
              </span>
            )}
          </div>
        );
      })()}

    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DIVISION_LABELS: Record<Division, string> = {
  emerging: "Emerging",
  scaling: "Scaling",
};

export default async function OrgPage({ params, searchParams }: Props) {
  const { slug: rawSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const slug = rawSlug.toLowerCase();
  const [quarters, quarter] = await Promise.all([
    getPublishedQuarters(),
    resolveQuarter(resolvedSearchParams?.quarter),
  ]);

  if (!quarter) notFound();

  const org = await findOrgBySlugForQuarter(slug, quarter);
  if (!org) notFound();
  const orgQuarters = await getPublishedQuartersForOrg(slug, quarters);
  const quarterParam = quarter.is_current ? null : quarter.id;

  const division = org.division;
  const rank = org.division_rank;

  // Score + signals
  const score = computeScore(org);
  const signals = buildSignals(org);
  const hasAnySignal = signals.some((s) => s.end != null);

  // Active package managers for the Package Downloads signal card
  const packageSources = [
    org.npm_weekly.some((p) => p.value > 0) ? "NPM" : null,
    org.pypi_weekly.some((p) => p.value > 0) ? "PyPI" : null,
    org.cargo_weekly.some((p) => p.value > 0) ? "Cargo" : null,
  ].filter((s): s is string => s !== null);

  // Display metadata
  const name = org.owner_name ?? slug;
  const description = org.owner_description;
  const logoUrl = org.owner_logo;
  const githubUrl = org.owner_url;
  const homepageUrl = org.homepage_url;

  const rankColor = getRankColor(rank);
  const rankGlow = getRankGlow(rank);
  const divisionLabel = DIVISION_LABELS[division];

  // Unused but kept for potential display
  void score;

  const quarterStart = org.quarter_start;
  const quarterEnd = org.quarter_end;

  // Chart metrics
  const BRAND = "#3ECF8E";
  const chartMetrics: MetricConfig[] = [
    {
      key: "stars",
      label: "Stars",
      data: org.github_stars_weekly,
      color: BRAND,
      periodLabel: "cumulative stars",
    },
    {
      key: "contributors",
      label: "Contributors",
      data: org.github_contributors_weekly,
      color: BRAND,
      periodLabel: "cumulative contributors",
    },
    {
      key: "npm",
      label: "NPM",
      data: org.npm_weekly,
      color: BRAND,
      periodLabel: "weekly downloads",
    },
    {
      key: "pypi",
      label: "PyPI",
      data: org.pypi_weekly,
      color: BRAND,
      periodLabel: "weekly downloads",
    },
    {
      key: "cargo",
      label: "Cargo",
      data: org.cargo_weekly,
      color: BRAND,
      periodLabel: "weekly downloads",
    },
  ];

  const hasChartData = chartMetrics.some((m) => m.data.length > 0);
  const hasRepos = org.repositories.length > 0;

  return (
    <>
      <SiteHeader quarters={orgQuarters} selectedQuarterId={quarter.id} />

      <main className="flex-1 min-h-screen">
        {/* Back nav */}
        <div className="border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 h-10 flex items-center">
            <Link
              href={hrefWithQuarter("/", quarterParam)}
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
            <div className="flex flex-col md:flex-row gap-8 md:gap-10 md:items-start">
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
                        {divisionLabel}
                      </span>
                      <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/40">
                        {quarter.label}
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
                      <GitHubIcon size={12} />
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
              <div className="flex flex-col items-center gap-5 md:pl-8 lg:pl-12 md:border-l md:border-white/10 shrink-0 w-full md:w-[240px] lg:w-[260px]">
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
                    rank · {divisionLabel}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 w-full flex gap-2">
                  <ShareButton
                    name={name}
                    rank={rank}
                    tierLabel={divisionLabel}
                    slug={slug}
                    quarterId={quarterParam}
                    quarterLabel={quarter.label}
                  />
                  <EmbedButton name={name} slug={slug} quarterId={quarterParam} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">

          {/* Signal breakdown */}
          {hasAnySignal && (
            <section className="space-y-5" data-testid="signal-breakdown-section">
              <div className="flex items-baseline gap-3">
                <h2 className="font-bold text-base text-foreground tracking-tight">
                  Signal Breakdown
                </h2>
                <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/35">
                  {quarter.label}
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {signals.map((signal) => (
                  <SignalCard
                    key={signal.key}
                    signal={signal}
                    division={division}
                    sources={
                      signal.key === "package_downloads" ? packageSources : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Growth chart */}
          {hasChartData && (
            <section className="space-y-5" data-testid="growth-chart-section">
              <div className="flex items-baseline gap-3">
                <h2 className="font-bold text-base text-foreground tracking-tight">
                  Growth Over Time
                </h2>
                <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/35">
                  {quarter.label}
                </span>
              </div>
              <div className="bg-card border border-white/10 rounded-xl p-6">
                <GrowthChart metrics={chartMetrics} quarterStart={quarterStart} quarterEnd={quarterEnd} />
              </div>
            </section>
          )}

          {/* Repositories */}
          {hasRepos && (
            <section className="space-y-5" data-testid="repositories-section">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <h2 className="font-bold text-base text-foreground tracking-tight">
                  Repositories
                </h2>
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
              <RepoTable repos={org.repositories} />
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
                  Division
                </span>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    "text-green"
                  )}
                >
                  {divisionLabel} ·{" "}
                  {division === "scaling" ? "≥1,000 stars" : "<1,000 stars"}
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
