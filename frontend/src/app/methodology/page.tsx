import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Badge } from "@/components/ui/badge"

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 px-4 py-3 bg-card border border-white/10 rounded font-mono text-sm text-foreground/90 overflow-x-auto">
      {children}
    </div>
  )
}

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-white/10 py-12">
      {children}
    </section>
  )
}

function SectionTitle({ step, children }: { step?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      {step && (
        <span className="font-mono text-xs text-muted-foreground shrink-0">{step}</span>
      )}
      <h2 className="text-xl font-semibold text-foreground tracking-tight">{children}</h2>
    </div>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-muted-foreground leading-relaxed space-y-4 max-w-2xl">{children}</div>
}

function MetricTable() {
  const metrics = [
    { key: "github_stars", label: "GitHub Stars", family: "github", description: "Net new stars on the org's repos" },
    { key: "github_contributors", label: "GitHub Contributors", family: "github", description: "Unique contributors across the org's repos" },
    { key: "package_downloads", label: "Package Downloads", family: "usage", description: "Aggregated download count across npm, PyPI, and Cargo (sum of available registries)" },
  ]

  const familyColors: Record<string, string> = {
    github: "text-green border-green/30 bg-green/5",
    usage: "text-blue-400 border-blue-400/30 bg-blue-400/5",
  }

  return (
    <div className="mt-6 border border-white/10 rounded overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-muted/30">
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Signal</th>
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Family</th>
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium hidden sm:table-cell">Description</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.key} className="border-b border-white/5 last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-4 py-2.5 font-mono text-xs text-foreground/80">{m.key}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-block font-mono text-xs border rounded px-1.5 py-0.5 ${familyColors[m.family]}`}>
                  {m.family}
                </span>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{m.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaddingTable() {
  const rows = [
    { metric: "github_stars", below: "100", above: "1,000" },
    { metric: "github_contributors", below: "5", above: "10" },
    { metric: "package_downloads", below: "1,000", above: "10,000" },
  ]

  return (
    <div className="mt-6 border border-white/10 rounded overflow-hidden">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="border-b border-white/10 bg-muted/30">
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium font-sans">Signal</th>
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium font-sans">Below 1,000 stars</th>
            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium font-sans">Above 1,000 stars</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.metric} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-2.5 text-xs text-foreground/80">{r.metric}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.below}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.above}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MethodologyPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 px-6 py-14">
          <div className="max-w-3xl mx-auto space-y-4">
            <Badge variant="outline" className="font-mono text-[0.65rem] uppercase tracking-widest border-white/20 text-muted-foreground px-2.5 py-1">
              Methodology
            </Badge>
            <h1
              className="font-bold leading-[1.15] text-foreground"
              style={{ fontSize: "clamp(1.75rem, 2vw + 0.75rem, 2.5rem)", letterSpacing: "-0.02em" }}
            >
              How the{" "}
              <span className="text-green">OSSCAR Index</span>{" "}
              is computed
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A transparent ranking of the fastest-growing open source organizations.
              Each quarter, we measure growth across three signals, score them on a common scale within peer groups, and combine the scores into a single composite via an L² norm.
            </p>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6">

          {/* Overview */}
          <Section id="overview">
            <SectionTitle>Overview</SectionTitle>
            <Prose>
              <p>
                The OSSCAR Index ranks GitHub organizations by how fast they are growing — not by how large they already are.
                Raw size metrics (total stars, total downloads) would simply surface the biggest names in open source.
                Instead, we measure the <em className="text-foreground not-italic font-medium">rate of change</em> over a single quarter, scored so that a small org and a large org can be compared fairly within their peer group.
              </p>
              <p>
                Three signals are tracked per organization. Not every org has data for every signal — a pure Python library won't have npm downloads.
                The composite step handles this gracefully: signals with no data contribute nothing to the score, and having more positive signals always helps. Breadth of growth is rewarded.
              </p>
            </Prose>
          </Section>

          {/* Step 1: Filter */}
          <Section id="filter">
            <SectionTitle step="01">Filter to GitHub organizations</SectionTitle>
            <Prose>
              <p>
                Only GitHub accounts of type organization are included.
                Personal accounts and forks are excluded. This ensures the index reflects meaningful project ecosystems rather than individual repositories.
              </p>
            </Prose>
          </Section>

          {/* Step 2: Divisions */}
          <Section id="divisions">
            <SectionTitle step="02">Assign to a division</SectionTitle>
            <Prose>
              <p>
                Organizations are split into two independent leaderboards based on their GitHub star count at the <em className="text-foreground not-italic font-medium">start</em> of the quarter:
              </p>
              <div className="grid grid-cols-2 gap-3 not-prose my-4">
                <div className="border border-white/10 rounded p-4">
                  <div className="font-mono text-xs text-muted-foreground mb-1">emerging</div>
                  <div className="text-foreground font-semibold">Emerging</div>
                  <div className="text-sm text-muted-foreground mt-1">stars_start &lt; 1,000</div>
                </div>
                <div className="border border-white/10 rounded p-4">
                  <div className="font-mono text-xs text-muted-foreground mb-1">scaling</div>
                  <div className="text-foreground font-semibold">Scaling</div>
                  <div className="text-sm text-muted-foreground mt-1">stars_start ≥ 1,000</div>
                </div>
              </div>
              <p>
                Keeping these divisions separate matters because relative growth at 100 stars is structurally different from growth at 100,000 stars.
                Scores and rankings are computed within each division independently.
              </p>
              <p>
                Division is locked at quarter start. An org that crosses 1,000 stars during the quarter stays in the emerging tier for that quarter's results.
              </p>
            </Prose>
          </Section>

          {/* Step 3: Signals */}
          <Section id="signals">
            <SectionTitle step="03">Measure three growth signals</SectionTitle>
            <Prose>
              <p>
                Each organization is tracked across three signals. For each signal, we record the value at the start and end of the quarter.
              </p>
            </Prose>
            <MetricTable />
            <Prose>
              <p className="mt-6">
                Package downloads aggregate npm, PyPI, and Cargo. If an org only publishes to one or two registries, we sum the available values rather than penalizing for missing ones. An org with no data across all three registries receives a null for this signal.
              </p>
              <p>
                The raw quarterly growth rate for a signal is:
              </p>
            </Prose>
            <Formula>
              growth_rate = (end − start) / padded_start
            </Formula>
            <Prose>
              <p>
                Rather than dividing by the raw start value, we divide by a <em className="text-foreground not-italic font-medium">padded start</em>: the larger of the actual start value and a minimum threshold.
                This prevents tiny absolute changes from producing enormous growth rates (e.g., going from 2 to 4 stars shouldn't outrank a project going from 5,000 to 8,000 stars).
              </p>
            </Prose>
            <Formula>
              padded_start = max(start, padding_threshold)
            </Formula>
            <Prose>
              <p>
                Padding thresholds differ by division to reflect the different scales of orgs in each tier:
              </p>
            </Prose>
            <PaddingTable />
            <Prose>
              <p className="mt-6">
                An organization is <em className="text-foreground not-italic font-medium">eligible</em> for a signal only when:
              </p>
              <ul className="list-none space-y-1 not-prose mt-2">
                {[
                  "Both start and end values are present (not null)",
                  "The end value meets or exceeds the padding threshold",
                  "The computed growth rate is ≥ 0 (we only reward growth, not decline)",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="font-mono text-green mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Prose>
          </Section>

          {/* Step 4: Log-minmax scoring */}
          <Section id="normalization">
            <SectionTitle step="04">Score growth via log-minmax scaling</SectionTitle>
            <Prose>
              <p>
                Raw growth rates can't be compared directly across signals — a 20% increase in stars means something very different from a 20% increase in package downloads.
                To put all signals on a common scale, we apply a two-step <em className="text-foreground not-italic font-medium">log-minmax</em> transform for each signal within each division:
              </p>
            </Prose>
            <Formula>
              <div>1. log_val = log(1 + growth_rate)</div>
              <div className="mt-1">2. score = (log_val − min) / (max − min) × 100</div>
            </Formula>
            <Prose>
              <p>
                The logarithm compresses the long tail of growth rates while preserving meaningful separation between a 10× and a 1,000× grower — unlike percentiles, which would give both nearly the same rank if they're both in the top 1%.
                The min-max step then maps the distribution to <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">[0, 100]</code>, making scores directly comparable across signals.
              </p>
              <p>
                No clipping is applied. If one org grows exceptionally fast, it anchors the maximum and compresses others downward — this is intentional. A genuinely exceptional grower should visibly dominate the leaderboard. Percentiles would obscure that; log-minmax preserves it.
              </p>
              <p>
                Both <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">min</code> and <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">max</code> are computed only over eligible organizations in the same division for that signal.
              </p>
            </Prose>
          </Section>

          {/* Step 5: Composite */}
          <Section id="composite">
            <SectionTitle step="05">Combine eligible scores via the L² norm</SectionTitle>
            <Prose>
              <p>
                Eligible per-signal scores are combined into a single composite using the L² (Euclidean) norm — the square root of the sum of squared scores:
              </p>
            </Prose>
            <Formula>
              composite_score = √(Σ score<sub>i</sub>²){"  "}(for each eligible signal i)
            </Formula>
            <Prose>
              <p>
                The L² norm is still <em className="text-foreground not-italic font-medium">breadth-rewarding</em> — because per-signal scores are non-negative, an additional eligible signal can only raise the composite. But compared to a plain sum, it weights <em className="text-foreground not-italic font-medium">standout performance</em> on a single signal more heavily: a score of (100, 0, 0) still maps to 100, while (50, 50, 50) maps to ≈86.6 rather than 150. Exceptional growth on one signal is no longer outranked by merely average growth on three.
              </p>
              <p>
                Signals with no data simply don't contribute to the sum of squares. An org that only publishes to GitHub is evaluated on two signals; one active across all three is evaluated on all three. The maximum possible composite is √(3 × 100²) ≈ 173.2 (three signals each scoring 100).
              </p>
            </Prose>
          </Section>

          {/* Step 6: Ranking */}
          <Section id="ranking">
            <SectionTitle step="06">Rank within each division</SectionTitle>
            <Prose>
              <p>
                Organizations are ranked by their composite score in descending order, independently within each division.
                Ties are broken by minimum rank (tied organizations share the same rank number).
              </p>
              <p>
                Division assignment is based on quarter-start stars, so the ranking reflects growth over a full quarter
                for a consistent peer group.
              </p>
            </Prose>
          </Section>

          {/* Questions */}
          <section className="py-12">
            <div className="border border-white/10 rounded p-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Questions or feedback?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This methodology will evolve as we refine the index. If you notice an org that seems misranked, a signal worth adding, or a scoring scheme worth discussing, reach out to the teams at Supabase and{" "}
                <span className="text-foreground">&gt;commit</span>.
              </p>
            </div>
          </section>

        </div>
      </main>

      <SiteFooter />
    </>
  )
}
