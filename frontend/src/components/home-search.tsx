"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, X, Package, Star, Mail } from "lucide-react"
import posthog from "posthog-js"
import type { Org, RepoEntry } from "@/types"
import { normalizeLogin } from "@/lib/normalize-login"
import { cn, formatCompact } from "@/lib/utils"
import { OrgLogo } from "@/components/org-logo"
import { ScoreRequestModal } from "@/components/score-request-modal"

const MAX_PER_GROUP = 6

type OrgHit = {
  type: "org"
  org: Org
  slug: string
  haystack: string
}

type RepoHit = {
  type: "repo"
  repo: RepoEntry
  org: Org
  slug: string
  haystack: string
}

type Hit = OrgHit | RepoHit

type Props = {
  orgs: Org[]
}

function divisionLabel(d: Org["division"]): string {
  return d === "scaling" ? "Scaling" : "Emerging"
}

export function HomeSearch({ orgs }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [scoreModalOpen, setScoreModalOpen] = useState(false)

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const { orgIndex, repoIndex } = useMemo(() => {
    const orgIdx: OrgHit[] = []
    const repoIdx: RepoHit[] = []
    for (const org of orgs) {
      const slug = normalizeLogin(org.owner_url) ?? ""
      if (!slug) continue
      orgIdx.push({
        type: "org",
        org,
        slug,
        haystack: `${org.owner_name} ${org.owner_login}`.toLowerCase(),
      })
      for (const repo of org.repositories) {
        repoIdx.push({
          type: "repo",
          repo,
          org,
          slug,
          haystack: repo.name.toLowerCase(),
        })
      }
    }
    return { orgIndex: orgIdx, repoIndex: repoIdx }
  }, [orgs])

  const trimmed = query.trim().toLowerCase()

  const { orgHits, repoHits, allHits } = useMemo(() => {
    if (!trimmed) {
      return { orgHits: [] as OrgHit[], repoHits: [] as RepoHit[], allHits: [] as Hit[] }
    }
    const orgMatches = orgIndex
      .filter((h) => h.haystack.includes(trimmed))
      .sort((a, b) => {
        const aPrefix = a.haystack.startsWith(trimmed) ? 0 : 1
        const bPrefix = b.haystack.startsWith(trimmed) ? 0 : 1
        if (aPrefix !== bPrefix) return aPrefix - bPrefix
        return a.org.owner_name.localeCompare(b.org.owner_name)
      })
      .slice(0, MAX_PER_GROUP)

    const repoMatches = repoIndex
      .filter((h) => h.haystack.includes(trimmed))
      .sort((a, b) => {
        const aPrefix = a.haystack.startsWith(trimmed) ? 0 : 1
        const bPrefix = b.haystack.startsWith(trimmed) ? 0 : 1
        if (aPrefix !== bPrefix) return aPrefix - bPrefix
        return (b.repo.stars ?? 0) - (a.repo.stars ?? 0)
      })
      .slice(0, MAX_PER_GROUP)

    return {
      orgHits: orgMatches,
      repoHits: repoMatches,
      allHits: [...orgMatches, ...repoMatches] as Hit[],
    }
  }, [trimmed, orgIndex, repoIndex])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  function hrefFor(hit: Hit): string {
    return `/org/${hit.slug}`
  }

  function onSelect(hit: Hit) {
    try {
      posthog.capture("home_search_result_click", {
        type: hit.type,
        query: trimmed,
        slug: hit.slug,
      })
    } catch {
      // PostHog not initialized — ignore.
    }
    setOpen(false)
    setQuery("")
    router.push(hrefFor(hit))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (allHits.length === 0) return
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, allHits.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (allHits.length === 0) return
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      if (!open || allHits.length === 0) return
      e.preventDefault()
      const hit = allHits[Math.min(activeIndex, allHits.length - 1)]
      if (hit) onSelect(hit)
    } else if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showDropdown = open && trimmed.length > 0
  const safeActiveIndex =
    allHits.length === 0 ? 0 : Math.min(activeIndex, allHits.length - 1)

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-80">
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/4 hover:bg-white/8 focus-within:border-white/20 focus-within:bg-white/8 px-3 h-9 transition-colors">
        <Search size={14} className="text-muted-foreground/60 shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search organizations or repositories…"
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
            setOpen(true)
          }}
          onFocus={() => {
            if (trimmed.length > 0) setOpen(true)
          }}
          onKeyDown={onKeyDown}
          className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          role="combobox"
          aria-label="Search organizations or repositories"
          aria-controls="home-search-listbox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-activedescendant={
            showDropdown && allHits.length > 0
              ? `home-search-option-${safeActiveIndex}`
              : undefined
          }
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setOpen(false)
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id="home-search-listbox"
          role="listbox"
          className="absolute right-0 left-0 mt-2 rounded-md border border-white/10 bg-background/95 backdrop-blur shadow-xl shadow-black/30 z-30 max-h-96 overflow-y-auto"
        >
          {allHits.length === 0 ? (
            <div className="px-4 py-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                No matches for <span className="text-foreground">&ldquo;{query}&rdquo;</span>
              </p>
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                The website only shows the top 100 per division, but we rank thousands more organizations. If your org isn&rsquo;t listed, you can still get a score.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setScoreModalOpen(true)
                }}
                className="inline-flex items-center gap-1.5 mt-1 font-mono text-[0.65rem] uppercase tracking-widest text-green hover:text-green/80 transition-colors cursor-pointer"
              >
                <Mail size={11} />
                Get your score by email →
              </button>
            </div>
          ) : (
            <>
              {orgHits.length > 0 && (
                <div className="py-1">
                  <div className="px-3 pt-2 pb-1 font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/50">
                    Organizations
                  </div>
                  {orgHits.map((hit, i) => {
                    const flatIndex = i
                    const active = safeActiveIndex === flatIndex
                    return (
                      <Link
                        key={`org-${hit.slug}`}
                        href={hrefFor(hit)}
                        id={`home-search-option-${flatIndex}`}
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => onSelect(hit)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 transition-colors",
                          active ? "bg-white/8" : "hover:bg-white/4"
                        )}
                      >
                        <OrgLogo
                          logoUrl={hit.org.owner_logo}
                          name={hit.org.owner_name}
                          size={28}
                          className="rounded-md"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {hit.org.owner_name}
                            </span>
                            <span className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground/50 shrink-0">
                              {divisionLabel(hit.org.division)} · #{hit.org.division_rank}
                            </span>
                          </div>
                          {hit.org.owner_description && (
                            <p className="text-xs text-muted-foreground/70 truncate">
                              {hit.org.owner_description}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {repoHits.length > 0 && (
                <div className={cn("py-1", orgHits.length > 0 && "border-t border-white/5")}>
                  <div className="px-3 pt-2 pb-1 font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/50">
                    Repositories
                  </div>
                  {repoHits.map((hit, i) => {
                    const flatIndex = orgHits.length + i
                    const active = safeActiveIndex === flatIndex
                    return (
                      <Link
                        key={`repo-${hit.slug}-${hit.repo.name}`}
                        href={hrefFor(hit)}
                        id={`home-search-option-${flatIndex}`}
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => onSelect(hit)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 transition-colors",
                          active ? "bg-white/8" : "hover:bg-white/4"
                        )}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 shrink-0">
                          <Package size={14} className="text-muted-foreground/70" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-foreground truncate">
                              {hit.repo.name}
                            </span>
                            {hit.repo.stars > 0 && (
                              <span className="flex items-center gap-1 font-mono text-[0.6rem] tabular-nums text-muted-foreground/60 shrink-0">
                                <Star size={10} />
                                {formatCompact(hit.repo.stars)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/70 truncate">
                            in {hit.org.owner_name}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {scoreModalOpen && <ScoreRequestModal onClose={() => setScoreModalOpen(false)} />}
    </div>
  )
}
