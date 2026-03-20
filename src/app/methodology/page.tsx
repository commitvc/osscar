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
    { key: "npm_downloads", label: "npm Downloads", family: "usage", description: "Monthly download count from npm" },
    { key: "pypi_downloads", label: "PyPI Downloads", family: "usage", description: "Monthly download count from PyPI" },
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
    { metric: "npm_downloads", below: "100", above: "1,000" },
    { metric: "pypi_downloads", below: "100", above: "1,000" },
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
              <span className="text-brand">OSS Growth Index</span>{" "}
              is computed
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A transparent, signal-weighted ranking of the fastest-growing open source organizations.
              Each quarter, we measure growth across four signals, normalize within peer groups, and produce a single composite score.
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
                The OSS Growth Index ranks GitHub organizations by how fast they are growing — not by how large they already are.
                Raw size metrics (total stars, total downloads) would simply surface the biggest names in open source.
                Instead, we measure the <em className="text-foreground not-italic font-medium">rate of change</em> over a single quarter, normalized so that a small org and a large org can be compared fairly within their peer group.
              </p>
              <p>
                Four signals are tracked per organization. Not every org has data for every signal — a pure Python library won't have npm downloads.
                The weighting step handles this gracefully: signals with no data contribute no weight, so the composite score adapts to whatever signals are available.
              </p>
            </Prose>
          </Section>

          {/* Step 1: Filter */}
          <Section id="filter">
            <SectionTitle step="01">Filter to GitHub organizations</SectionTitle>
            <Prose>
              <p>
                Only Github accounts of type organization are included.
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
                  <div className="font-mono text-xs text-muted-foreground mb-1">below_1000</div>
                  <div className="text-foreground font-semibold">Emerging</div>
                  <div className="text-sm text-muted-foreground mt-1">stars_start &lt; 1,000</div>
                </div>
                <div className="border border-white/10 rounded p-4">
                  <div className="font-mono text-xs text-muted-foreground mb-1">above_1000</div>
                  <div className="text-foreground font-semibold">Established</div>
                  <div className="text-sm text-muted-foreground mt-1">stars_start ≥ 1,000</div>
                </div>
              </div>
              <p>
                Keeping these divisions separate matters because relative growth at 100 stars is structurally different from growth at 100,000 stars.
                Z-scores, percentiles, and rankings are all computed within each division independently.
              </p>
              <p>
                Division is locked at quarter start. An org that crosses 1,000 stars during the quarter stays in the emerging tier for that quarter's results.
              </p>
            </Prose>
          </Section>

          {/* Step 3: Signals */}
          <Section id="signals">
            <SectionTitle step="03">Measure four growth signals</SectionTitle>
            <Prose>
              <p>
                Each organization is tracked across four signals. For each signal, we record the value at the start and end of the quarter.
              </p>
            </Prose>
            <MetricTable />
            <Prose>
              <p className="mt-6">
                The raw quarterly growth rate for a signal is:
              </p>
            </Prose>
            <Formula>
              growth_rate = (end − start) / padded_start
            </Formula>
            <Prose>
              <p>
                Rather than dividing by the raw start value, we divide by a <em className="text-foreground not-italic font-medium">padded start</em>: the larger of the actual start value and a minimum threshold.
                This prevents tiny absolute changes from producing enormous growth rates (e.g., going from 2 to 4 stars shouldn't produce a 100% growth rate that outranks a project going from 5,000 to 8,000 stars).
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
              <p className="mt-4">
                Orgs that don't use npm or PyPI simply won't have data for those signals, so they're ineligible for them. The weighting step (below) ensures this doesn't penalize them.
              </p>
            </Prose>
          </Section>

          {/* Step 4: Robust scaling */}
          <Section id="normalization">
            <SectionTitle step="04">Normalize growth rates within each division</SectionTitle>
            <Prose>
              <p>
                Raw growth rates can't be compared directly across signals — a 20% increase in stars means something very different from a 20% increase in PyPI downloads.
                To put all signals on a common scale, we apply <em className="text-foreground not-italic font-medium">robust scaling</em> (equivalent to scikit-learn's <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">RobustScaler</code>) for each signal within each division:
              </p>
            </Prose>
            <Formula>
              scaled = (growth_rate − median) / IQR
            </Formula>
            <Prose>
              <p>
                where <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">median</code> and <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">IQR</code> (interquartile range, Q75 − Q25) are computed only over eligible organizations in the same division.
              </p>
              <p>
                Unlike z-score normalization, this approach is robust to outliers — a single org with explosive growth won't distort the scale for everyone else, since the median and IQR are not sensitive to extreme values.
              </p>
              <p>
                We also compute a <em className="text-foreground not-italic font-medium">growth percentile</em> (what fraction of peers this org grew faster than) and a <em className="text-foreground not-italic font-medium">size percentile</em> (where the org's end-of-quarter value ranks among peers). Both are used in the weighting step.
              </p>
            </Prose>
          </Section>

          {/* Step 5: Weighting */}
          <Section id="weighting">
            <SectionTitle step="05">Weight signals by growth × size</SectionTitle>
            <Prose>
              <p>
                Not all signals should contribute equally. An org with 10 million npm downloads should have its npm growth weighted more heavily than an org with 200 downloads.
                Signals where an org is both large and growing fast should dominate; irrelevant signals (zero data) should contribute nothing.
              </p>
              <p>
                For each eligible signal, a <em className="text-foreground not-italic font-medium">weight magnitude</em> is computed as the product of two percentiles:
              </p>
            </Prose>
            <Formula>
              weight_magnitude = growth_percentile × size_percentile
            </Formula>
            <Prose>
              <p>
                This rewards signals where the org is both growing quickly (high growth percentile) <em className="text-foreground not-italic font-medium">and</em> operating at meaningful scale (high size percentile).
                An org that is large but not growing, or growing fast but from near-zero, will have a lower magnitude than one doing both.
              </p>
              <p>
                Ineligible signals have <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">null</code> magnitude and are excluded entirely.
                Magnitudes are then normalized so weights sum to 1 across the signals that are active for each org:
              </p>
            </Prose>
            <Formula>
              final_weight<sub>i</sub> = weight_magnitude<sub>i</sub> / Σ weight_magnitudes
            </Formula>
          </Section>

          {/* Step 6: Composite */}
          <Section id="composite">
            <SectionTitle step="06">Compute composite score</SectionTitle>
            <Prose>
              <p>
                The composite score is a weighted sum of scaled growth rates across all eligible signals:
              </p>
            </Prose>
            <Formula>
              composite_score = Σ (final_weight<sub>i</sub> × scaled_rate<sub>i</sub>)
            </Formula>
            <Prose>
              <p>
                Because each scaled rate is relative to that signal's distribution within the division, and the weights adapt to the signals each org actually uses, the composite score is directly comparable across all organizations in the same division — regardless of which signals they participate in.
              </p>
              <p>
                An org only active on GitHub and PyPI is evaluated on those two signals with their weights summing to 1.
                An org active across all four signals is evaluated on all four, with the same property.
              </p>
            </Prose>
          </Section>

          {/* Step 7: Ranking */}
          <Section id="ranking">
            <SectionTitle step="07">Rank within each division</SectionTitle>
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

          {/* What's not included */}
          <Section id="excluded">
            <SectionTitle>What is not included</SectionTitle>
            <Prose>
              <p>
                A few things are explicitly out of scope in the current methodology:
              </p>
              <ul className="space-y-2 not-prose mt-2">
                {[
                  { label: "Web visits", note: "Tracked internally but not included in the composite score for this edition." },
                  { label: "Absolute size", note: "Having 10 million stars doesn't help your score. Only rate of change matters." },
                  { label: "Historical trend", note: "Each quarter is computed independently. A single quarter of high growth earns a high rank." },
                  { label: "Individual repos", note: "The unit of analysis is the GitHub organization, not individual repositories." },
                ].map((item) => (
                  <li key={item.label} className="flex items-start gap-3 text-sm">
                    <span className="font-mono text-muted-foreground mt-0.5 shrink-0">—</span>
                    <span>
                      <span className="text-foreground font-medium">{item.label}.</span>{" "}
                      <span className="text-muted-foreground">{item.note}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Prose>
          </Section>

          {/* Questions */}
          <section className="py-12">
            <div className="border border-white/10 rounded p-6 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Questions or feedback?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This methodology will evolve as we refine the index. If you notice an org that seems misranked, a signal worth adding, or a weighting scheme worth discussing, reach out to the teams at Supabase and{" "}
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
