import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { OrgTable } from "@/components/org-table"
import { Badge } from "@/components/ui/badge"
import { QUARTER_LABEL } from "@/lib/config"
import { getExperimentDivision } from "@/lib/data"

type Experiment = {
  /** Directory name under frontend/data/experiments/ (matches methodology script name) */
  dataDir: string
  title: string
  formula: string
  description: string
}

/** Keyed by URL slug (/experiments/<slug>) -> experiment config. */
const EXPERIMENTS: Record<string, Experiment> = {
  "no-normalization": {
    dataDir: "no_normalization",
    title: "No Normalization",
    formula: "score = Σ growth_rate_i",
    description:
      "Drops the log / min-max transform. The composite is the raw sum of per-metric growth rates, so extreme outliers dominate.",
  },
  "l2-norm": {
    dataDir: "l2_norm",
    title: "L² Norm",
    formula: "score = (Σ scaled_iᵖ)^(1/p), p = 2",
    description:
      "Per-metric scoring is unchanged (log(1+growth) min-max scaled to [0, 100]). The composite aggregates via the 2-norm instead of a plain sum.",
  },
  "l3-norm": {
    dataDir: "l3_norm",
    title: "L³ Norm",
    formula: "score = (Σ scaled_iᵖ)^(1/p), p = 3",
    description:
      "Same per-metric scoring as the live methodology, aggregated via the 3-norm. Higher p more strongly rewards a single dominant metric.",
  },
  "stars-boost": {
    dataDir: "stars_boost",
    title: "Stars Boost",
    formula: "score = 1·stars + 0.5·contributors + 0.5·package_downloads",
    description:
      "Per-metric scoring unchanged. The composite weights GitHub stars at 1.0 and both contributors and package downloads at 0.5.",
  },
  "median-imputation": {
    dataDir: "median_imputation",
    title: "Median Imputation",
    formula: "missing_growth ← division median, then log-minmax, then Σ score_i",
    description:
      "Levels the playing field by imputing missing metrics with the division-level median of the eligible growth rates. Everything else (log-minmax scaling, sum composite) stays the same as the live methodology.",
  },
  "no-minmax": {
    dataDir: "no_minmax",
    title: "No Min-Max",
    formula: "score_i = log(1 + growth_rate_i); composite = Σ score_i",
    description:
      "Drops the final min-max rescale from the live methodology but keeps the log compression. Metrics no longer share a common [0, 100] range, so their relative contributions shift with each distribution's absolute log spread.",
  },
  "stars-with-bonus": {
    dataDir: "stars_with_bonus",
    title: "Stars With Bonus",
    formula: "composite = stars_score × (1 + contrib_score/100 + downloads_score/100)",
    description:
      "Stars-anchored composite where contributors and package downloads act as multiplicative bonuses (each caps at +1.0, since per-metric scores live in [0, 100]). Orgs with no stars signal don't rank; missing contributors or downloads simply forgo that bonus.",
  },
  "stars-mean-bonus": {
    dataDir: "stars_mean_bonus",
    title: "Stars With Mean Bonus",
    formula: "composite = stars_score × (1 + mean(eligible_other_scores) / 100)",
    description:
      "Stars is the anchor; contributors and package downloads contribute via the mean of whatever is available. A one-bonus-metric org is treated the same as a two-bonus-metric org, so broader coverage doesn't help — only stars + the average strength of the other signals matter. Composite is bounded in [0, 200].",
  },
  "stars-boost-no-minmax": {
    dataDir: "stars_boost_no_minmax",
    title: "Stars Boost (No Min-Max)",
    formula: "score_i = log(1 + growth_i);  composite = 1·stars + 0.5·contrib + 0.5·packages",
    description:
      "Combines the stars-boost weighting with the no-minmax scoring: per-metric scores are raw log(1+growth) (no [0, 100] rescale), then aggregated with stars weighted 1.0 and contributors/downloads weighted 0.5.",
  },
}

export function generateStaticParams() {
  return Object.keys(EXPERIMENTS).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const exp = EXPERIMENTS[slug]
  if (!exp) return {}
  return {
    title: `${exp.title} · OSSCARs experiment`,
    description: exp.description,
  }
}

export default async function ExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const exp = EXPERIMENTS[slug]
  if (!exp) notFound()

  const emerging = getExperimentDivision(exp.dataDir, "emerging")
  const scaling = getExperimentDivision(exp.dataDir, "scaling")

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-white/10 px-6 py-14">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="font-mono text-[0.65rem] uppercase tracking-widest border-amber-500/60 text-amber-400 px-2.5 py-1"
              >
                Experiment
              </Badge>
              <Badge
                variant="outline"
                className="font-mono text-[0.65rem] uppercase tracking-widest border-white/20 text-muted-foreground px-2.5 py-1"
              >
                {QUARTER_LABEL}
              </Badge>
            </div>
            <h1
              className="font-bold leading-[1.15] text-foreground"
              style={{ fontSize: "clamp(1.75rem, 2vw + 0.75rem, 2.5rem)", letterSpacing: "-0.02em" }}
            >
              {exp.title}{" "}
              <span className="text-green">alternative methodology</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {exp.description}
            </p>
            <div className="inline-block px-3 py-2 bg-card border border-white/10 rounded font-mono text-sm text-foreground/90">
              {exp.formula}
            </div>
            <div>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors font-mono"
              >
                ← Back to live rankings
              </a>
            </div>
          </div>
        </section>

        <section className="px-6 py-10">
          <div className="max-w-6xl mx-auto">
            <OrgTable emerging={emerging} scaling={scaling} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
