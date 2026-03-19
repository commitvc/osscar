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
              Q4 2025
            </Badge>
            <h1
              className="font-bold leading-[1.15] text-foreground"
              style={{ fontSize: "clamp(1.75rem, 2vw + 0.75rem, 2.5rem)", letterSpacing: "-0.02em" }}
            >
              Top Fastest-Growing{" "}
              <span className="text-brand">Open Source Organizations</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Ranked by composite growth across GitHub stars, contributors, npm, PyPI, and Hugging Face. Updated quarterly by{" "}
              <span className="text-foreground font-semibold">Supabase</span>
              {" × "}
              <span className="text-foreground font-semibold">&gt;commit</span>.
            </p>
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
