import { getAbove1000, getBelow1000 } from "@/lib/data"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { OrgTable } from "@/components/org-table"
import { Badge } from "@/components/ui/badge"

export default async function Home() {
  const above = getAbove1000().slice(0, 100)
  const below = getBelow1000().slice(0, 100)

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-white/10 px-6 py-14">
          <div className="max-w-6xl mx-auto space-y-4">
            <Badge variant="outline" className="font-mono text-[0.65rem] uppercase tracking-widest border-white/20 text-muted-foreground px-2.5 py-1">
              Q1 2026
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
          <div className="max-w-6xl mx-auto">
            <OrgTable above={above} below={below} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
