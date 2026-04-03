import Image from "next/image"
import Link from "next/link"

export function SiteHeader() {
  return (
    <header className="border-b border-white/10 sticky top-0 z-50 bg-background/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 font-bold tracking-[-0.02em] text-foreground hover:text-brand transition-colors">
            <Image
              src="/osscar-icon.svg"
              alt="OSSCAR"
              width={22}
              height={22}
              style={{ width: "22px", height: "22px" }}
            />
            OSSCAR
          </Link>
          <span className="text-white/20 text-sm select-none">|</span>
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">Q1 2026</span>
        </div>
        <div className="flex items-center gap-3">
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
