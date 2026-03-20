export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 mt-auto">
      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between text-xs text-muted-foreground">
        <span>© 2025 Supabase × &gt;commit</span>
        <div className="flex items-center gap-4">
          <a href="/methodology" className="hover:text-foreground transition-colors">
            Methodology
          </a>
        </div>
      </div>
    </footer>
  )
}
