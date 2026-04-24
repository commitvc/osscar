import Image from "next/image"
import Link from "next/link"
import { QUARTER_LABEL } from "@/lib/config"

export function SiteHeader() {
  return (
    <header className="border-b border-white/10 sticky top-0 z-50 bg-background/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="group flex items-center gap-1 font-bold tracking-[-0.02em] text-foreground hover:text-brand transition-colors">
            <span
              role="img"
              aria-label="OSSCAR"
              className="block bg-foreground group-hover:bg-brand transition-colors shrink-0"
              style={{
                width: "20px",
                height: "26px",
                WebkitMaskImage: "url(/osscar-logo-icon-white.png)",
                maskImage: "url(/osscar-logo-icon-white.png)",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
            OSSCAR
          </Link>
          <span className="font-mono text-[0.6rem] sm:text-[0.65rem] uppercase tracking-widest text-muted-foreground whitespace-nowrap border border-white/10 rounded-full px-2 py-0.5">{QUARTER_LABEL}</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
            <Image
              src="/supabase-logo-wordmark--dark.png"
              alt="Supabase"
              height={18}
              width={120}
              style={{ width: "auto", height: "18px" }}
              className="opacity-80 hover:opacity-100 transition-opacity"
            />
          </a>
          <span className="text-white/30 text-xs select-none">×</span>
          <a href="https://commit.fund" target="_blank" rel="noopener noreferrer">
            <Image
              src="/commit-logo-dark.svg"
              alt=">commit"
              height={18}
              width={77}
              style={{ width: "auto", height: "18px" }}
              className="opacity-80 hover:opacity-100 transition-opacity"
            />
          </a>
        </div>
      </div>
    </header>
  )
}
