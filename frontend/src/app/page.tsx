import { getEmerging, getScaling, extractSlug } from "@/lib/data"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { OrgTable } from "@/components/org-table"
import { ScoreRequestCta } from "@/components/score-request-cta"
import { ScoreRequestButton } from "@/components/score-request-button"

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
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://github.com/commitvc/osscar"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/20 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground transition-colors hover:border-white/40 hover:text-foreground"
              >
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="h-3 w-3 fill-current"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                  />
                </svg>
                <span>View on GitHub</span>
              </a>
            </div>
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
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
              <ScoreRequestButton />
              <a href="/methodology" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors font-mono">
                Read the methodology →
              </a>
            </div>
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
