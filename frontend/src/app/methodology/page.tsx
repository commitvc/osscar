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
    { metric: "github_contributors", below: "1", above: "5" },
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
              A walkthrough of the decisions behind the index: what we measure, how we score it, the alternatives we tested, and the reasoning that got us here.
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
                The OSSCAR Index ranks the fastest-growing GitHub organizations each quarter. We focus on organization accounts (excluding personal accounts and forks), split them into two divisions by starting star count so smaller and larger ecosystems are evaluated among peers, measure growth across three signals (GitHub stars, contributors, and package downloads from npm, PyPI, and Cargo), normalize each signal within its division using a log–minmax transform, and combine the resulting scores into a single composite via the L² norm. Organizations are then ranked by this composite within their division.
              </p>
              <p>
                Two principles drive the design. First, we measure growth rather than absolute size, so established projects that have plateaued don&rsquo;t crowd out emerging momentum. Second, coverage varies across ecosystems, so the method must remain fair when some signals are missing.
              </p>
            </Prose>
          </Section>

          {/* Step 1: Filter */}
          <Section id="filter">
            <SectionTitle step="01">Filter to GitHub organizations</SectionTitle>
            <Prose>
              <p>
                The first decision we had to make was what to rank. We considered three units of analysis: individual repositories, GitHub organizations, and companies.
              </p>
              <p>
                Repositories would have given us the most granularity, but the same entity could easily show up in the ranking several times under different repos. Companies would be a clean option, but they are a more abstract concept. Matching orgs to companies means pulling in external data sources, and a lot of interesting non-commercial projects would fall out of the index entirely.
              </p>
              <p>
                Organizations sat in the middle, so the index is restricted to accounts of type organization. Personal accounts and forks are excluded.
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
                We keep the divisions separate because growth at 100 stars doesn&rsquo;t look like growth at 100,000 stars. Scores and rankings are computed within each division on its own.
              </p>
              <p>
                Division is locked at quarter start. If an org crosses 1,000 stars during the quarter, it still stays in the emerging tier for that quarter&rsquo;s results.
              </p>
            </Prose>
          </Section>

          {/* Step 3: Signals */}
          <Section id="signals">
            <SectionTitle step="03">Measure three growth signals</SectionTitle>
            <Prose>
              <p>
                We track three signals per org: GitHub stars, GitHub contributors, and package downloads (summed across npm, PyPI, and Cargo). These are the ones we could collect consistently at scale from public sources, and together they cover both attention (stars), contribution (contributors), and actual usage (downloads).
              </p>
              <p>
                One constraint showed up immediately: not every org has every metric. A pure Python library has no npm or Cargo downloads. An infra project without published packages has no download data at all. Any scoring scheme had to work with a variable number of available signals without punishing orgs just for not publishing packages. That constraint shaped the eligibility rules below and, later, the aggregation choice in step 05.
              </p>
              <p>
                For each signal, we record the value at the start and end of the quarter.
              </p>
            </Prose>
            <MetricTable />
            <Prose>
              <p className="mt-6">
                Package downloads aggregate npm, PyPI, and Cargo. If an org only publishes to one or two registries, we sum the available values instead of penalizing it for the ones it&rsquo;s missing. An org with no data across all three registries gets a null for this signal.
              </p>
              <p>
                The quarterly growth rate shown in the table is the raw rate:
              </p>
            </Prose>
            <Formula>
              growth_rate = (end − start) / start
            </Formula>
            <Prose>
              <p>
                For ranking, we divide instead by a <em className="text-foreground not-italic font-medium">padded start</em>: whichever is larger, the actual start value or a minimum threshold. This prevents tiny absolute changes from producing outsized rank gains. Going from 2 to 4 stars shouldn&rsquo;t outrank a project going from 5,000 to 8,000 stars. The padded rate only feeds the scoring step below. It&rsquo;s never shown as the displayed growth.
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
                These numbers aren&rsquo;t arbitrary. For each signal, the threshold is set to roughly the 10th percentile of that signal within the division, so only orgs sitting in the noise floor end up padded.
              </p>
              <p>
                An organization is <em className="text-foreground not-italic font-medium">eligible</em> for a signal only when:
              </p>
              <ul className="list-none space-y-1 not-prose mt-2">
                {[
                  "Both start and end values are present (not null)",
                  "The end value meets or exceeds the padding threshold",
                  "The padded growth rate is ≥ 0 (we reward growth, not decline)",
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
                Raw growth rates can&rsquo;t be compared directly across signals. A 20% increase in stars means something very different from a 20% increase in package downloads. We needed a way to put every signal on the same scale so they could be combined later.
              </p>
              <p>
                Our first attempt was straight percentile ranks. The appeal was obvious: every signal gets a <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">[0, 100]</code> score for free, with no tuning. The problem is that growth is heavily long-tailed. A 10× grower and a 1,000× grower can both land in the top 1%, but they&rsquo;re clearly not the same story. Percentiles collapsed that gap and flattened the top of the leaderboard.
              </p>
              <p>
                We ended up with a two-step <em className="text-foreground not-italic font-medium">log-minmax</em> transform for each signal within each division:
              </p>
            </Prose>
            <Formula>
              <div>1. log_val = log(1 + growth_rate)</div>
              <div className="mt-1">2. score = (log_val − min) / (max − min) × 100</div>
            </Formula>
            <Prose>
              <p>
                The logarithm compresses the long tail of growth rates while keeping real separation between a 10× and a 1,000× grower. The min-max step then maps the distribution to <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">[0, 100]</code>, so scores are directly comparable across signals.
              </p>
              <p>
                We don&rsquo;t clip. If one org grows exceptionally fast, it anchors the maximum and pushes everyone else down. That&rsquo;s the point. An exceptional grower should stand out on the leaderboard, and log-minmax makes that visible in a way percentiles can&rsquo;t.
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
                This was the step that took the most iteration. Because an org can have anywhere from one to three eligible signals, combining their scores into a single number is trickier than it first looks.
              </p>
              <p>
                We started with a weighted sum. First with equal fixed weights, then with dynamic weights that varied by growth magnitude and by org size. It looked clean on paper, but we kept running into the same flaw: the weighted sum quietly penalizes orgs that happen to be active on more signals.
              </p>
              <p>
                Here&rsquo;s the problem that convinced us to drop it. Take two orgs in the same division. Org A grew 100× on stars and 50× on package downloads. Org B grew 100× on stars and has no package data. With a weighted sum <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">w_stars · 100 + w_pkg · 50</code>, org A only beats org B when <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">w_pkg</code> is large. For reasonable weightings, org A ends up ranked below org B. That&rsquo;s backwards: org A matches B on stars and also has impressive package growth, and the scheme punishes it for having more data.
              </p>
              <p>
                We moved to the L² (Euclidean) norm, which is the square root of the sum of squared scores:
              </p>
            </Prose>
            <Formula>
              composite_score = √(Σ score<sub>i</sub>²){"  "}(for each eligible signal i)
            </Formula>
            <Prose>
              <p>
                This fixes the weighted-sum problem directly. Per-signal scores are non-negative, so squaring and summing means an extra non-zero signal can only add to the composite. Org A strictly beats org B.
              </p>
              <p>
                It&rsquo;s worth stepping back for a second on why <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">p=2</code> specifically. The L<sup>p</sup> norms are a whole family, parametrized by <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">p</code>. At <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">p=1</code> you get the plain sum we just rejected. At <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">p=∞</code> you get only the single largest signal, and everything else is ignored. <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground/80">p=2</code> sits in between as the familiar Euclidean norm. Squaring amplifies big values disproportionately, so a standout signal carries more weight than in a sum, while extra signals still push the composite up.
              </p>
              <p>
                A few other properties fell out for free:
              </p>
              <ul className="list-none space-y-2 not-prose mt-3">
                {[
                  { k: "No weights to tune", v: "Every eligible signal enters on equal terms, which avoided a whole category of \u201Cwhat should w_pkg actually be?\u201D debates." },
                  { k: "Standout performance wins", v: "A score of (100, 0, 0) maps to 100, while (50, 50, 50) maps to \u224886.6 rather than 150. An exceptional result on one signal isn\u2019t drowned out by middling results on three." },
                  { k: "Breadth still helps", v: "An org with two eligible signals scoring (80, 60) composites to 100, ahead of a single-signal org scoring 80 on its own." },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="font-mono text-green mt-0.5 shrink-0">›</span>
                    <span>
                      <span className="text-foreground font-medium">{item.k}.</span>{" "}{item.v}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6">
                Signals with no data don&rsquo;t contribute to the sum of squares. An org that only publishes to GitHub is evaluated on two signals; one active across all three is evaluated on all three. The maximum possible composite is √(3 × 100²) ≈ 173.2 (three signals each scoring 100).
              </p>
            </Prose>
          </Section>

          {/* Step 6: Ranking */}
          <Section id="ranking">
            <SectionTitle step="06">Rank within each division</SectionTitle>
            <Prose>
              <p>
                Organizations are ranked by their composite score in descending order, within each division on its own.
                Ties are broken by minimum rank (tied organizations share the same rank number).
              </p>
              <p>
                Division assignment is based on quarter-start stars, so the ranking reflects growth over a full quarter
                for a consistent peer group.
              </p>
            </Prose>
          </Section>

          {/* Limitations and what's next */}
          <Section id="limitations">
            <SectionTitle>Limitations and what&rsquo;s next</SectionTitle>
            <Prose>
              <ul className="list-none space-y-3 not-prose">
                {[
                  { k: "First version", v: "This is the first version of the index, and the methodology will keep evolving. Expect signals, thresholds, and scoring choices to change as we iterate." },
                  { k: "Weekly data collection", v: "We snapshot data on a weekly cadence, so the start and end of a quarter rarely align with its exact first and last day. Instead, the quarter is bounded by the weekly snapshots closest to those dates." },
                  { k: "Package coverage", v: "We currently track downloads from three registries: npm, PyPI, and Cargo. Orgs that publish to other ecosystems (Maven, RubyGems, NuGet, Go modules, Hex, and others) are effectively ranked on stars and contributors alone. We plan to expand registry coverage over time." },
                  { k: "Short-term growth bias", v: "Because the index measures a single quarter, mature projects that have plateaued at high adoption can rank poorly, even when they\u2019re foundational to their ecosystem. The index is a picture of momentum, not of importance." },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="font-mono text-green mt-0.5 shrink-0">›</span>
                    <span>
                      <span className="text-foreground font-medium">{item.k}.</span>{" "}{item.v}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6">
                The project is fully open source. You can find the pipeline, data, and website in{" "}
                <a
                  href="https://github.com/commitvc/osscar"
                  target="_blank"
                  rel="noreferrer"
                  className="text-green underline underline-offset-4 hover:text-green/80 transition-colors"
                >
                  our GitHub repository
                </a>
                . If you spot something wrong, want to suggest a new signal, or want to discuss any step of the methodology, open an issue there.
              </p>
            </Prose>
          </Section>

        </div>
      </main>

      <SiteFooter />
    </>
  )
}
