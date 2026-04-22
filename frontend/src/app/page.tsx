import { getEmerging, getScaling, extractSlug } from "@/lib/data"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { OrgTable } from "@/components/org-table"
import { ScoreRequestCta } from "@/components/score-request-cta"
import { Badge } from "@/components/ui/badge"
import { QUARTER_LABEL } from "@/lib/config"

export default async function Home() {
  const emerging = getEmerging()
  const scaling = getScaling()

  // Build slug → active package managers map from per-manager weekly series
  const packageSources: Record<string, string[]> = {}
  for (const org of [...emerging, ...scaling]) {
    const slug = extractSlug(org.owner_url)
    if (!slug) continue
    const sources = [
      org.npm_weekly.some((p) => p.value > 0) ? "NPM" : null,
      org.pypi_weekly.some((p) => p.value > 0) ? "PyPI" : null,
      org.cargo_weekly.some((p) => p.value > 0) ? "Cargo" : null,
    ].filter((s): s is string => s !== null)
    if (sources.length > 0) packageSources[slug] = sources
  }

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 px-6 py-14">
          <div className="max-w-6xl mx-auto space-y-4">
            <Badge variant="outline" className="font-mono text-[0.65rem] uppercase tracking-widest border-white/20 text-muted-foreground px-2.5 py-1">
              {QUARTER_LABEL}
            </Badge>
            <h1
              className="font-bold leading-[1.15] text-foreground"
              style={{ fontSize: "clamp(1.75rem, 2vw + 0.75rem, 2.5rem)", letterSpacing: "-0.02em" }}
            >
              Top Fastest-Growing{" "}
              <span className="text-green">Open Source Organizations</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Ranked by composite growth across GitHub stars, contributors and package downloads. Updated quarterly by{" "}
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold hover:text-green transition-colors">Supabase</a>
              {" × "}
              <a href="https://commit.fund" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold hover:text-[#E73423] transition-colors">&gt;commit</a>.
            </p>
            <a href="/methodology" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors font-mono">
              Read the methodology →
            </a>
          </div>
        </section>

        {/* Rankings */}
        <section className="px-6 py-10">
          <div className="max-w-6xl mx-auto space-y-8">
            <OrgTable emerging={emerging} scaling={scaling} packageSources={packageSources} />
            <ScoreRequestCta />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
