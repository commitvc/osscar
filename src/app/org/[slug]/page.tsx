import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Star,
  Users,
  Package,
  Package2,
  Github,
  Globe,
  Linkedin,
  ChevronLeft,
  ArrowUpRight,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { OrgLogo } from "@/components/org-logo";
import { GrowthChart, type MetricConfig } from "@/components/growth-chart";
import { ShareButton } from "@/components/share-button";
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
import type { OrgEntry, FrontendOrgData, Tier } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ slug: string }>;
};

// ─── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const [above, below] = [getAbove1000(), getBelow1000()];
  return [...above, ...below]
    .filter((o) => o.github_owner_url)
    .map((o) => ({ slug: extractSlug(o.github_owner_url) ?? "" }))
    .filter((p) => p.slug);
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();
  const above = getAbove1000();
  const below = getBelow1000();
  const rankingOrg =
    above.find((o) => extractSlug(o.github_owner_url) === slug) ??
    below.find((o) => extractSlug(o.github_owner_url) === slug);

  if (!rankingOrg) return { title: "OSS Growth Index" };

  const score = computeScore(rankingOrg);
  return {
    title: `${rankingOrg.company_name} — OSS Growth Index Q4 2025`,
    description: `${rankingOrg.company_name} on the OSS Growth Index Q4 2025 with a composite score of ${formatScore(score)}.`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸", Germany: "🇩🇪", "United Kingdom": "🇬🇧",
  France: "🇫🇷", Canada: "🇨🇦", China: "🇨🇳", India: "🇮🇳",
  Japan: "🇯🇵", Israel: "🇮🇱", Australia: "🇦🇺", Netherlands: "🇳🇱",
  Switzerland: "🇨🇭", Sweden: "🇸🇪", Norway: "🇳🇴", Finland: "🇫🇮",
  Denmark: "🇩🇰", Brazil: "🇧🇷", Singapore: "🇸🇬", "South Korea": "🇰🇷",
  Spain: "🇪🇸", Italy: "🇮🇹", Poland: "🇵🇱", Russia: "🇷🇺",
  Ukraine: "🇺🇦", Austria: "🇦🇹", Belgium: "🇧🇪", "Czech Republic": "🇨🇿",
  Portugal: "🇵🇹", Taiwan: "🇹🇼", "Hong Kong": "🇭🇰", "New Zealand": "🇳🇿",
  Mexico: "🇲🇽", Argentina: "🇦🇷", Chile: "🇨🇱", Colombia: "🇨🇴",
  Turkey: "🇹🇷", "South Africa": "🇿🇦", Nigeria: "🇳🇬", Egypt: "🇪🇬",
  "United Arab Emirates": "🇦🇪", Romania: "🇷🇴", Hungary: "🇭🇺",
  Greece: "🇬🇷", Ireland: "🇮🇪", Indonesia: "🇮🇩", Pakistan: "🇵🇰",
  Vietnam: "🇻🇳", Thailand: "🇹🇭", Malaysia: "🇲🇾",
};

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
  weight: number | null;
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
      weight: org.github_stars_final_weight,
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
      weight: org.github_contributors_final_weight,
    },
    {
      key: "npm_downloads",
      label: "NPM Downloads",
      icon: Package,
      color: "#FB923C",
      end: org.npm_downloads_end,
      start: org.npm_downloads_start,
      rate: org.npm_downloads_growth_rate,
      percentile: org.npm_downloads_growth_percentile,
      weight: org.npm_downloads_final_weight,
    },
    {
      key: "pypi_downloads",
      label: "PyPI Downloads",
      icon: Package2,
      color: "#A78BFA",
      end: org.pypi_downloads_end,
      start: org.pypi_downloads_start,
      rate: org.pypi_downloads_growth_rate,
      percentile: org.pypi_downloads_growth_percentile,
      weight: org.pypi_downloads_final_weight,
    },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalCard({
  signal,
  weightPct,
}: {
  signal: SignalConfig;
  weightPct: number;
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

      {/* Value + rate */}
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="font-mono text-3xl font-bold text-foreground tabular-nums leading-none">
          {hasData ? formatCompact(signal.end) : "—"}
        </span>
        {signal.rate != null && (
          <span
            className={cn(
              "font-mono text-xs font-semibold px-2 py-0.5 rounded-sm tabular-nums",
              isPositive
                ? "bg-green/15 text-green"
                : "bg-brand/15 text-brand"
            )}
          >
            {formatGrowthRate(signal.rate)}
          </span>
        )}
      </div>

      {/* Weight bar */}
      <div className="space-y-1.5 mt-auto pt-1">
        <div className="h-[3px] bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, weightPct)}%`,
              backgroundColor: signal.color,
            }}
          />
        </div>
        <span className="font-mono text-[0.7rem] text-muted-foreground/50">
          {weightPct.toFixed(1)}% of score
        </span>
      </div>
    </div>
  );
}

function ScoreBar({
  signals,
  total,
}: {
  signals: SignalConfig[];
  total: number;
}) {
  const active = signals.filter((s) => (s.weight ?? 0) > 0);
  if (total === 0 || active.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="h-2 rounded-full flex overflow-hidden gap-[2px]">
        {active.map((s) => {
          const pct = ((s.weight ?? 0) / total) * 100;
          return (
            <div
              key={s.key}
              className="h-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: s.color,
                minWidth: pct > 1 ? "4px" : "0",
              }}
              title={`${s.label}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {active.map((s) => {
          const pct = ((s.weight ?? 0) / total) * 100;
          return (
            <div key={s.key} className="flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-mono text-[0.6rem] text-muted-foreground/55 uppercase tracking-wider">
                {s.label}
              </span>
              <span className="font-mono text-[0.6rem] text-muted-foreground/35">
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
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

  const aboveOrg = above.find((o) => extractSlug(o.github_owner_url) === slug);
  const belowOrg = below.find((o) => extractSlug(o.github_owner_url) === slug);
  const rankingOrg: OrgEntry | undefined = aboveOrg ?? belowOrg;

  const frontendOrg: FrontendOrgData | undefined = frontendData.find(
    (o) => extractSlug(o.github_url) === slug
  );

  if (!rankingOrg && !frontendOrg) notFound();

  // Rank + tier
  const tier: Tier = aboveOrg ? "above_1000" : "below_1000";
  const tierData = tier === "above_1000" ? above : below;
  const rankIndex = tierData.findIndex(
    (o) => extractSlug(o.github_owner_url) === slug
  );
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  // Score + signals
  const score = rankingOrg ? computeScore(rankingOrg) : 0;
  const signals = rankingOrg ? buildSignals(rankingOrg) : [];
  const hasAnySignal = signals.some((s) => s.end != null);

  // Display metadata
  const name = rankingOrg?.company_name ?? frontendOrg?.name ?? slug;
  const description = rankingOrg?.description ?? frontendOrg?.description ?? null;
  const logoUrl = rankingOrg?.logo_url ?? frontendOrg?.logo_url ?? null;
  const country = rankingOrg?.country ?? frontendOrg?.country ?? null;
  const githubUrl = rankingOrg?.github_owner_url ?? frontendOrg?.github_url ?? null;
  const homepageUrl = rankingOrg?.homepage_url ?? frontendOrg?.homepage_url ?? null;
  const linkedinUrl = rankingOrg?.linkedin_url ?? null;

  const flag = country ? COUNTRY_FLAGS[country] : null;
  const rankColor = rank ? getRankColor(rank) : "rgba(255,255,255,0.5)";
  const rankGlow = rank ? getRankGlow(rank) : "none";
  const tierLabel = tier === "above_1000" ? "Heavyweight" : "Lightweight";

  // Chart metrics — all use the brand accent color for visual consistency
  const BRAND = "#F69694";
  const chartMetrics: MetricConfig[] = frontendOrg
    ? [
        {
          key: "stars",
          label: "Stars",
          data: frontendOrg.github_stars_weekly,
          color: BRAND,
          periodLabel: "cumulative stars",
        },
        {
          key: "contributors",
          label: "Contributors",
          data: frontendOrg.github_contributors_weekly,
          color: BRAND,
          periodLabel: "cumulative contributors",
        },
        {
          key: "npm",
          label: "NPM",
          data: frontendOrg.npm_weekly,
          color: BRAND,
          periodLabel: "weekly downloads",
        },
        {
          key: "pypi",
          label: "PyPI",
          data: frontendOrg.pypi_weekly,
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
                "radial-gradient(ellipse 55% 90% at 90% 50%, rgba(246,150,148,0.04) 0%, transparent 65%)",
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
                      {flag && (
                        <span className="ml-2.5 text-2xl align-baseline">
                          {flag}
                        </span>
                      )}
                    </h1>
                    <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                      <span
                        className="font-mono text-[0.6rem] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-sm border border-brand/30 bg-brand/10 text-brand"
                      >
                        {tierLabel}
                      </span>
                      <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/40">
                        Q4 2025
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
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/4 hover:bg-white/8 transition-all font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground/70 hover:text-foreground group"
                    >
                      <Linkedin size={12} />
                      LinkedIn
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
                <div className="flex flex-col items-center gap-5 lg:pl-12 lg:border-l lg:border-white/10 shrink-0 w-full lg:w-[220px]">
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

                  <div className="border-t border-white/10 pt-4 w-full">
                    <ShareButton
                      name={name}
                      rank={rank}
                      tierLabel={tierLabel}
                      slug={slug}
                    />
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
                  Q4 2025
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {signals.map((signal) => {
                  const weightPct =
                    score > 0
                      ? ((signal.weight ?? 0) / score) * 100
                      : 0;
                  return (
                    <SignalCard
                      key={signal.key}
                      signal={signal}
                      weightPct={weightPct}
                    />
                  );
                })}
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
                  2025
                </span>
              </div>
              <div className="bg-card border border-white/10 rounded-xl p-6">
                <GrowthChart metrics={chartMetrics} />
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
                <p className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/35">
                  Methodology
                </p>
                <p className="text-xs text-muted-foreground/45 leading-relaxed">
                  Rankings are based on quarter-over-quarter growth across GitHub
                  stars, contributors, npm downloads, and PyPI downloads. Each
                  signal is normalized to a percentile rank within the tier and
                  weighted by relevance to produce a composite score.
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                <span className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground/30">
                  Tier
                </span>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    tier === "above_1000" ? "text-green" : "text-brand"
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
