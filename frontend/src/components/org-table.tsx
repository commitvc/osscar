"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type Column,
} from "@tanstack/react-table"
import { ExternalLink, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Star, Users, Package } from "lucide-react"
import { Tooltip } from "@base-ui/react/tooltip"
import type { Org, Division } from "@/types"
import { formatCompact, formatPercentile, formatTopPct, cn } from "@/lib/utils"
import { calculateRankingGrowthRate, formatGrowthMultiplier } from "@/lib/growth"
import { PADDING_THRESHOLDS, type MetricKey } from "@/lib/padding-thresholds"
import { hrefWithQuarter } from "@/lib/quarter-url"
import {
  filterRankingsForPage,
  getRankingPageCount,
  getRankingPageIndex,
  getRankingPageRange,
} from "@/lib/ranking-pagination"
import type { RankingReveal } from "@/lib/ranking-reveal"
import { GitHubIcon } from "@/components/github-icon"
import { OrgLogo } from "@/components/org-logo"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const DIVISION_LABELS: Record<Division, string> = {
  scaling: "Scaling",
  emerging: "Emerging",
}

const RANK_PIPS: Record<number, string> = {
  1: "#F4C430",
  2: "#C0C0C0",
  3: "#CD7F32",
}

const PODIUM_COLORS = [
  RANK_PIPS[1],
  RANK_PIPS[2],
  RANK_PIPS[3],
] as const

function computePackageDownloads(org: Org): { value: number | null; rate: number | null; percentile: number | null } {
  if (org.package_downloads_end == null) return { value: null, rate: null, percentile: null }
  return {
    value: org.package_downloads_end,
    rate: org.package_downloads_growth_rate,
    percentile: org.package_downloads_growth_percentile,
  }
}

const METRIC_LABELS: Record<MetricKey, string> = {
  github_stars: "stars",
  github_contributors: "contributors",
  package_downloads: "downloads",
}

function singularize(label: string): string {
  return label.endsWith("s") ? label.slice(0, -1) : label
}

interface MetricCellProps {
  value: number | null
  rate: number | null
  startValue?: number | null
  percentile?: number | null
  metric: MetricKey
  division: Division
  sources?: string[]
}

function PercentileLine({ percentile, metricLabel }: { percentile: number | null | undefined; metricLabel: string }) {
  const pct = formatPercentile(percentile ?? null)
  const top = formatTopPct(percentile ?? null)
  if (!pct) return null
  return (
    <p className="text-muted-foreground">
      {metricLabel[0].toUpperCase() + metricLabel.slice(1)} growth ranks in the{" "}
      <span className="font-semibold text-foreground">{pct}</span>
      {top ? <> (<span className="text-foreground">{top}</span>)</> : null} of the division sample.
    </p>
  )
}

function MetricCell({ value, rate, startValue, percentile, metric, division, sources }: MetricCellProps) {
  const hasData = value != null || rate != null
  if (!hasData) {
    return (
      <div className="flex flex-col items-end justify-center h-9">
        <span className="font-mono text-sm text-muted-foreground/25">—</span>
      </div>
    )
  }

  const metricLabel = METRIC_LABELS[metric]
  const baseline = PADDING_THRESHOLDS[metric][division]
  const rankingRate = percentile != null
    ? calculateRankingGrowthRate(startValue ?? null, value, baseline)
    : null
  const showRate = rankingRate != null
  const isLowBaseline =
    startValue != null && value != null && startValue < baseline
  const hasPercentile = percentile != null
  const baselineLabel = baseline === 1 ? singularize(metricLabel) : metricLabel

  const SourceBadges = sources && sources.length > 0 ? (
    <>
      {sources.map((s) => (
        <span
          key={s}
          className="font-mono text-[0.6rem] font-semibold uppercase tracking-wider leading-none px-1.5 py-0.5 rounded-sm border border-white/10 bg-white/4 text-muted-foreground/65"
        >
          {s}
        </span>
      ))}
    </>
  ) : null

  if (isLowBaseline) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger className="cursor-default w-full">
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {SourceBadges}
            <span className="font-mono text-sm font-semibold text-foreground tabular-nums leading-none">
              {value != null ? formatCompact(value) : "—"}
            </span>
            {showRate ? (
              <span className="font-mono text-[0.7rem] font-semibold tabular-nums leading-none px-1.5 py-0.5 rounded-sm bg-green/15 text-green">
                {formatGrowthMultiplier(rankingRate)}
              </span>
            ) : null}
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" sideOffset={6}>
            <Tooltip.Popup className="z-50 max-w-xs rounded-md border border-white/10 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg space-y-1.5">
              <p>
                {showRate
                  ? <>Ranking growth: <span className="font-semibold text-green">{formatGrowthMultiplier(rankingRate)}</span> ({formatCompact(baseline)} → {formatCompact(value)}). Chart values: {formatCompact(startValue)} → {formatCompact(value)}{rate != null ? <> ({formatGrowthMultiplier(rate)} actual)</> : null}.</>
                  : <>Because the ending value is below the minimum baseline of {formatCompact(baseline)} {baselineLabel}, this signal is not used for ranking.</>}
              </p>
              <PercentileLine percentile={percentile} metricLabel={metricLabel} />
              <a href="/methodology" className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground hover:text-green transition-colors font-mono">
                Read the methodology →
              </a>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    )
  }

  const cellContent = (
    <div className="flex items-center justify-end gap-1.5 flex-wrap">
      {SourceBadges}
      <span className="font-mono text-sm font-semibold text-foreground tabular-nums leading-none">
        {value != null ? formatCompact(value) : "—"}
      </span>
      {showRate ? (
        <span className="font-mono text-[0.7rem] font-semibold tabular-nums leading-none px-1.5 py-0.5 rounded-sm bg-green/15 text-green">
          {formatGrowthMultiplier(rankingRate)}
        </span>
      ) : (
        <span className="text-[0.7rem] leading-none text-muted-foreground/25">—</span>
      )}
    </div>
  )

  if (!hasPercentile) return cellContent

  return (
    <Tooltip.Root>
      <Tooltip.Trigger className="cursor-default w-full">
        {cellContent}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={6}>
          <Tooltip.Popup className="z-50 max-w-xs rounded-md border border-white/10 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg space-y-1.5">
            <PercentileLine percentile={percentile} metricLabel={metricLabel} />
            <a href="/methodology" className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground hover:text-green transition-colors font-mono">
              Read the methodology →
            </a>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

type SortMode = "growth" | "absolute"

function SortHeader({ column, label, align = "right", sortMode, onToggleMode }: {
  column: Column<Org, unknown>
  label: string
  align?: "left" | "right"
  sortMode?: SortMode
  onToggleMode?: () => void
}) {
  const sorted = column.getIsSorted()

  return (
    <div className={`flex flex-col gap-1${align === "right" ? " items-end" : " items-start"}`}>
      <button
        onClick={column.getToggleSortingHandler()}
        className="flex items-center gap-1 cursor-pointer select-none group"
      >
        {label}
        <span className={cn(
          "transition-colors",
          sorted ? "text-foreground" : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
        )}>
          {sorted === "asc"
            ? <ChevronUp size={11} />
            : sorted === "desc"
            ? <ChevronDown size={11} />
            : <ChevronsUpDown size={11} />}
        </span>
      </button>
      {sortMode && onToggleMode && (
        <div className="flex rounded-sm overflow-hidden border border-white/8">
          <button
            onClick={(e) => { e.stopPropagation(); if (sortMode !== "growth") onToggleMode() }}
            className={cn(
              "px-1.5 py-px font-mono text-[0.5rem] uppercase tracking-wider cursor-pointer transition-colors",
              sortMode === "growth" ? "bg-green/15 text-green" : "text-muted-foreground/30 hover:text-muted-foreground/60"
            )}
          >
            growth
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (sortMode !== "absolute") onToggleMode() }}
            className={cn(
              "px-1.5 py-px font-mono text-[0.5rem] uppercase tracking-wider cursor-pointer transition-colors border-l border-white/8",
              sortMode === "absolute" ? "bg-green/15 text-green" : "text-muted-foreground/30 hover:text-muted-foreground/60"
            )}
          >
            total
          </button>
        </div>
      )}
    </div>
  )
}

/** Returns the padded rate used by the methodology, but only for ranked signals. */
function displayedGrowth(
  start: number | null,
  end: number | null,
  metric: MetricKey,
  division: Division,
  percentile: number | null,
): number | null {
  if (percentile == null) return null
  return calculateRankingGrowthRate(start, end, PADDING_THRESHOLDS[metric][division])
}

/** Compare two nullable numbers for sorting. Nulls always last, Infinity always first (in natural asc, TanStack flips for desc). */
function compareMetric(a: number | null, b: number | null): number {
  // Nulls: use sortUndefined-like behavior — always push to end
  // Return -Infinity proxy so TanStack desc flip puts them at bottom
  const aNum = a == null ? -Infinity : a
  const bNum = b == null ? -Infinity : b
  return aNum - bNum
}

const columnHelper = createColumnHelper<Org>()

interface CardMetricRowProps {
  icon: typeof Star
  label: string
  value: number | null
  startValue: number | null
  percentile: number | null
  metric: MetricKey
  division: Division
  sources?: string[]
}

function CardMetricRow({ icon: Icon, label, value, startValue, percentile, metric, division, sources }: CardMetricRowProps) {
  const hasData = value != null
  const rankingRate = displayedGrowth(startValue, value, metric, division, percentile)
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Icon size={11} className="text-muted-foreground/45 shrink-0" />
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/65 truncate">
          {label}
        </span>
        {sources && sources.length > 0 && (
          <span className="font-mono text-[0.55rem] font-semibold uppercase tracking-wider px-1 py-0.5 rounded-sm border border-white/10 bg-white/4 text-muted-foreground/70 shrink-0">
            {sources.join("·")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn(
          "font-mono text-sm tabular-nums leading-none",
          hasData ? "font-semibold text-foreground" : "text-muted-foreground/30"
        )}>
          {value != null ? formatCompact(value) : "—"}
        </span>
        {rankingRate != null ? (
          <span
            className="font-mono text-[0.65rem] font-semibold tabular-nums leading-none px-1.5 py-0.5 rounded-sm bg-green/15 text-green"
            title="Growth multiplier used for ranking"
          >
            {formatGrowthMultiplier(rankingRate)}
          </span>
        ) : (
          <span className="font-mono text-[0.65rem] leading-none text-muted-foreground/25 px-1.5">—</span>
        )}
      </div>
    </div>
  )
}

interface OrgCardProps {
  org: Org
  rank: number
  slug?: string
  quarterId?: string | null
  pkg: { value: number | null; rate: number | null; percentile: number | null }
  sources?: string[]
}

function OrgCard({ org, rank, slug, quarterId, pkg, sources }: OrgCardProps) {
  const pip = RANK_PIPS[rank]
  const rankColor = rank === 1 ? "#F4C430" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : null

  return (
    <div
      data-testid="ranking-entry"
      data-ranking-rank={rank}
      className={cn(
        "rounded-lg border border-white/10 bg-card/50 p-4 space-y-3 transition-colors",
        rank <= 3 && "border-l-2",
      )}
      style={rankColor ? { borderLeftColor: rankColor } : undefined}
    >
      {/* Top: rank + logo + name + links */}
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5 w-8">
          {pip ? (
            <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: pip }} />
          ) : (
            <span className="size-1.5 shrink-0" />
          )}
          <span className={cn(
            "font-mono text-sm tabular-nums",
            rank <= 3 ? "text-foreground font-semibold" : rank <= 10 ? "text-foreground" : "text-muted-foreground"
          )}>
            {rank}
          </span>
        </div>
        <OrgLogo logoUrl={org.owner_logo} name={org.owner_name} size={28} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <Link
            href={slug ? hrefWithQuarter(`/org/${slug}`, quarterId) : "#"}
            data-testid="ranking-org-link"
            className="block font-semibold text-sm text-foreground hover:text-green transition-colors truncate leading-snug"
          >
            {org.owner_name}
          </Link>
          {org.owner_description && (
            <p className="text-xs text-muted-foreground/75 line-clamp-1 leading-snug mt-0.5">
              {org.owner_description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-1">
          {org.homepage_url && (
            <a
              href={org.homepage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Homepage"
            >
              <ExternalLink size={14} />
            </a>
          )}
          {org.owner_url && (
            <a
              href={org.owner_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <GitHubIcon size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-1.5 pl-[2.75rem] pr-0.5">
        <CardMetricRow
          icon={Star}
          label="Stars"
          value={org.github_stars_end}
          startValue={org.github_stars_start}
          percentile={org.github_stars_growth_percentile}
          metric="github_stars"
          division={org.division}
        />
        <CardMetricRow
          icon={Users}
          label="Contributors"
          value={org.github_contributors_end}
          startValue={org.github_contributors_start}
          percentile={org.github_contributors_growth_percentile}
          metric="github_contributors"
          division={org.division}
        />
        <CardMetricRow
          icon={Package}
          label="Downloads"
          value={pkg.value}
          startValue={org.package_downloads_start}
          percentile={pkg.percentile}
          metric="package_downloads"
          division={org.division}
          sources={sources}
        />
      </div>
    </div>
  )
}

function MobileRevealTeasers({ ranks }: { ranks: number[] }) {
  return (
    <>
      {ranks.map((rank, index) => (
        <div
          key={rank}
          data-testid="ranking-teaser"
          aria-hidden="true"
          className="relative overflow-hidden rounded-lg border border-l-2 border-white/8 bg-card/30 p-4"
          style={{ borderLeftColor: PODIUM_COLORS[index] }}
        >
          <div className="flex items-center gap-3 opacity-35 blur-[3px] select-none">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: PODIUM_COLORS[index] }}
            />
            <span className="w-5 font-mono text-sm tabular-nums">{rank}</span>
            <span className="size-7 shrink-0 rounded-sm bg-white/20" />
            <span className="h-3 w-32 rounded-full bg-white/25" />
            <span className="ml-auto h-3 w-14 rounded-full bg-white/15" />
          </div>
          {index === 0 ? (
            <span className="absolute inset-y-0 right-4 flex items-center font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/70">
              Coming soon
            </span>
          ) : null}
        </div>
      ))}
    </>
  )
}

function DesktopRevealTeasers({ ranks }: { ranks: number[] }) {
  return (
    <>
      {ranks.map((rank, index) => (
        <TableRow
          key={rank}
          data-testid="ranking-teaser"
          aria-hidden="true"
          className="border-l-2 border-white/8 bg-white/[0.015] hover:bg-white/[0.015]"
          style={{ borderLeftColor: PODIUM_COLORS[index] }}
        >
          <TableCell className="py-3">
            <div className="flex items-center gap-2 select-none">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: PODIUM_COLORS[index] }}
              />
              <span className="font-mono text-sm tabular-nums opacity-30 blur-[3px]">
                {rank}
              </span>
            </div>
          </TableCell>
          <TableCell className="py-3">
            <div className="flex items-center gap-2.5 opacity-35 blur-[3px] select-none">
              <span className="size-6 shrink-0 rounded-sm bg-white/20" />
              <span className="h-3 w-28 rounded-full bg-white/25" />
            </div>
            {index === 0 ? (
              <span className="sr-only">More ranking entries are coming soon.</span>
            ) : null}
          </TableCell>
          <TableCell className="py-3 pl-4">
            <div className="ml-auto h-3 w-16 rounded-full bg-white/15 opacity-35 blur-[3px]" />
          </TableCell>
          <TableCell className="py-3">
            <div className="ml-auto h-3 w-16 rounded-full bg-white/15 opacity-35 blur-[3px]" />
          </TableCell>
          <TableCell className="py-3">
            <div className="ml-auto h-3 w-24 rounded-full bg-white/15 opacity-35 blur-[3px]" />
          </TableCell>
          <TableCell className="py-3" />
        </TableRow>
      ))}
    </>
  )
}

interface OrgTableProps {
  emerging: Org[]
  scaling: Org[]
  packageSources?: Record<string, string[]>
  quarterId?: string | null
  reveal: RankingReveal
  searchSlot?: React.ReactNode
}

export function OrgTable({ emerging, scaling, packageSources = {}, quarterId, reveal, searchSlot }: OrgTableProps) {
  const [activeDivision, setActiveDivision] = useState<Division>("emerging")
  const firstAvailablePageIndex = getRankingPageIndex(reveal.visibleFromRank)
  const [pageIndex, setPageIndex] = useState(firstAvailablePageIndex)
  const [sorting, setSorting] = useState<SortingState>([])
  const [starsSortMode, setStarsSortMode] = useState<SortMode>("growth")
  const [contribSortMode, setContribSortMode] = useState<SortMode>("growth")
  const [pkgSortMode, setPkgSortMode] = useState<SortMode>("growth")

  // Refs so sortingFn always reads the latest mode without depending on closures
  const starsModeRef = useRef(starsSortMode)
  starsModeRef.current = starsSortMode
  const contribModeRef = useRef(contribSortMode)
  contribModeRef.current = contribSortMode
  const pkgModeRef = useRef(pkgSortMode)
  pkgModeRef.current = pkgSortMode

  // Create new sort-state objects to break TanStack's internal memo cache
  const forceSortRefresh = () => setSorting(prev => prev.length > 0 ? prev.map(s => ({ ...s })) : prev)

  const columns = useMemo(() => [
    columnHelper.accessor(() => 0 as number, {
      id: "rank",
      enableSorting: true,
      sortingFn: (rowA, rowB) =>
        rowA.original.division_rank - rowB.original.division_rank,
      sortDescFirst: false,
      header: ({ column }) => <SortHeader column={column} label="RANKING" align="left" />,
      cell: ({ row }) => {
        const rank = row.original.division_rank
        const pip = RANK_PIPS[rank]
        return (
          <div className="flex items-center gap-2">
            {pip ? (
              <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: pip }} />
            ) : (
              <span className="size-1.5 shrink-0" />
            )}
            <span className={cn(
              "font-mono text-sm tabular-nums",
              rank <= 3 ? "text-foreground font-semibold" : rank <= 10 ? "text-foreground" : "text-muted-foreground"
            )}>
              {rank}
            </span>
          </div>
        )
      },
    }),
    columnHelper.accessor((row: Org) => row.owner_name, {
      id: "org",
      enableSorting: true,
      sortDescFirst: false,
      header: ({ column }) => <SortHeader column={column} label="ORGANIZATION" align="left" />,
      cell: ({ row }) => {
        const org = row.original
        return (
          <div className="flex items-start gap-2.5">
            <OrgLogo logoUrl={org.owner_logo} name={org.owner_name} size={24} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <Link
                href={
                  org.owner_url
                    ? hrefWithQuarter(
                        `/org/${org.owner_url.trim().replace(/\/$/, "").split("/").pop()?.toLowerCase()}`,
                        quarterId,
                      )
                    : "#"
                }
                data-testid="ranking-org-link"
                className="font-semibold text-sm text-foreground hover:text-green transition-colors truncate leading-snug flex items-baseline gap-1 cursor-pointer"
              >
                <span className="truncate">{org.owner_name}</span>
              </Link>
              {org.owner_description ? (
                <Tooltip.Root>
                  <Tooltip.Trigger
                    className="text-xs text-muted-foreground block truncate leading-snug w-full text-left cursor-default"
                  >
                    {org.owner_description}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner side="bottom" align="start" sideOffset={6}>
                      <Tooltip.Popup className="z-50 max-w-xs rounded-md border border-white/10 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
                        {org.owner_description}
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ) : (
                <span className="text-xs block leading-snug">{"\u00A0"}</span>
              )}
            </div>
          </div>
        )
      },
    }),
    columnHelper.accessor(
      row => row.github_stars_end ?? 0,
      {
        id: "gh_stars",
        sortUndefined: 1,
        sortDescFirst: true,
        sortingFn: (rowA, rowB) => {
          const mode = starsModeRef.current
          const aVal = mode === "growth"
            ? displayedGrowth(rowA.original.github_stars_start, rowA.original.github_stars_end, "github_stars", rowA.original.division, rowA.original.github_stars_growth_percentile)
            : rowA.original.github_stars_end
          const bVal = mode === "growth"
            ? displayedGrowth(rowB.original.github_stars_start, rowB.original.github_stars_end, "github_stars", rowB.original.division, rowB.original.github_stars_growth_percentile)
            : rowB.original.github_stars_end
          return compareMetric(aVal, bVal)
        },
        header: ({ column }) => (
          <SortHeader
            column={column}
            label="STARS"
            sortMode={starsSortMode}
            onToggleMode={() => { setStarsSortMode(m => m === "growth" ? "absolute" : "growth"); forceSortRefresh() }}
          />
        ),
        cell: ({ row }) => (
          <MetricCell
            value={row.original.github_stars_end}
            rate={row.original.github_stars_growth_rate}
            startValue={row.original.github_stars_start}
            percentile={row.original.github_stars_growth_percentile}
            metric="github_stars"
            division={row.original.division}
          />
        ),
      },
    ),
    columnHelper.accessor(
      row => row.github_contributors_end ?? 0,
      {
        id: "gh_contrib",
        sortUndefined: 1,
        sortDescFirst: true,
        sortingFn: (rowA, rowB) => {
          const mode = contribModeRef.current
          const aVal = mode === "growth"
            ? displayedGrowth(rowA.original.github_contributors_start, rowA.original.github_contributors_end, "github_contributors", rowA.original.division, rowA.original.github_contributors_growth_percentile)
            : rowA.original.github_contributors_end
          const bVal = mode === "growth"
            ? displayedGrowth(rowB.original.github_contributors_start, rowB.original.github_contributors_end, "github_contributors", rowB.original.division, rowB.original.github_contributors_growth_percentile)
            : rowB.original.github_contributors_end
          return compareMetric(aVal, bVal)
        },
        header: ({ column }) => (
          <SortHeader
            column={column}
            label="CONTRIBUTORS"
            sortMode={contribSortMode}
            onToggleMode={() => { setContribSortMode(m => m === "growth" ? "absolute" : "growth"); forceSortRefresh() }}
          />
        ),
        cell: ({ row }) => (
          <MetricCell
            value={row.original.github_contributors_end}
            rate={row.original.github_contributors_growth_rate}
            startValue={row.original.github_contributors_start}
            percentile={row.original.github_contributors_growth_percentile}
            metric="github_contributors"
            division={row.original.division}
          />
        ),
      },
    ),
    columnHelper.accessor(
      row => computePackageDownloads(row).value ?? 0,
      {
        id: "packages",
        sortUndefined: 1,
        sortDescFirst: true,
        sortingFn: (rowA, rowB) => {
          const mode = pkgModeRef.current
          const aData = computePackageDownloads(rowA.original)
          const bData = computePackageDownloads(rowB.original)
          let aVal: number | null, bVal: number | null
          if (mode === "absolute") {
            aVal = aData.value
            bVal = bData.value
          } else {
            const aStart = rowA.original.package_downloads_start
            const bStart = rowB.original.package_downloads_start
            aVal = displayedGrowth(aStart, aData.value, "package_downloads", rowA.original.division, aData.percentile)
            bVal = displayedGrowth(bStart, bData.value, "package_downloads", rowB.original.division, bData.percentile)
          }
          return compareMetric(aVal, bVal)
        },
        header: ({ column }) => (
          <SortHeader
            column={column}
            label="PACKAGE DOWNLOADS"
            sortMode={pkgSortMode}
            onToggleMode={() => { setPkgSortMode(m => m === "growth" ? "absolute" : "growth"); forceSortRefresh() }}
          />
        ),
        cell: ({ row }) => {
          const { value, rate, percentile } = computePackageDownloads(row.original)
          const slug = row.original.owner_url
            ? row.original.owner_url.trim().replace(/\/$/, "").split("/").pop()?.toLowerCase()
            : undefined
          const sources = slug ? packageSources[slug] : undefined
          return (
            <MetricCell
              value={value}
              rate={rate}
              startValue={row.original.package_downloads_start}
              percentile={percentile}
              metric="package_downloads"
              division={row.original.division}
              sources={sources}
            />
          )
        },
      },
    ),
    columnHelper.display({
      id: "links",
      header: "",
      cell: ({ row }) => {
        const org = row.original
        return (
          <div className="flex items-center gap-2 justify-end">
            {org.homepage_url && (
              <a
                href={org.homepage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Homepage"
              >
                <ExternalLink size={14} />
              </a>
            )}
            {org.owner_url && (
              <a
                href={org.owner_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="GitHub"
              >
                <GitHubIcon size={14} />
              </a>
            )}
          </div>
        )
      },
    }),
  ], [starsSortMode, contribSortMode, pkgSortMode, quarterId, packageSources])

  const activeData = activeDivision === "scaling" ? scaling : emerging
  const pageData = useMemo(
    () => filterRankingsForPage(activeData, pageIndex),
    [activeData, pageIndex],
  )
  const pageCount = getRankingPageCount(reveal.totalRankCount)
  const pageRange = getRankingPageRange(pageIndex, reveal.totalRankCount)
  const visiblePageStartRank = Math.max(
    pageRange.startRank,
    reveal.visibleFromRank,
  )
  const isFirstAvailablePage = pageIndex === firstAvailablePageIndex

  // TanStack Table deliberately returns mutable accessors; this component is
  // therefore excluded from React Compiler memoization by the compatibility rule.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: pageData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  function handleDivisionChange(division: Division) {
    setActiveDivision(division)
    setPageIndex(firstAvailablePageIndex)
  }

  return (
    <div className="space-y-4" data-testid="rankings">
      {/* Division selector + optional search */}
      <div className="flex flex-col-reverse gap-3 border-b border-white/10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="flex gap-6">
          {(["emerging", "scaling"] as Division[]).map((division) => (
            <button
              key={division}
              onClick={() => handleDivisionChange(division)}
              data-testid={`division-tab-${division}`}
              className={cn(
                "pb-3 text-xs uppercase tracking-widest font-semibold transition-colors -mb-px cursor-pointer",
                activeDivision === division
                  ? "border-b-2 border-green text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              {DIVISION_LABELS[division]}
            </button>
          ))}
        </div>
        {searchSlot && <div className="sm:pb-2">{searchSlot}</div>}
      </div>

      {reveal.teaserRanks.length > 0 ? (
        <div
          data-testid="ranking-reveal-status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-green/15 bg-green/[0.04] px-3 py-2"
        >
          <span className="relative z-10 font-mono text-[0.6rem] uppercase tracking-widest text-green/90">
            Ranking reveal in progress
          </span>
          <span className="relative z-10 text-xs text-muted-foreground/70">
            {activeData.length} of {reveal.totalRankCount} rankings are live. More are coming.
          </span>
        </div>
      ) : null}

      {/* Mobile/tablet card list */}
      <div className="lg:hidden space-y-2">
        {isFirstAvailablePage ? <MobileRevealTeasers ranks={reveal.teaserRanks} /> : null}
        {table.getRowModel().rows.map((row) => {
          const org = row.original
          const rank = org.division_rank
          const slug = org.owner_url
            ? org.owner_url.trim().replace(/\/$/, "").split("/").pop()?.toLowerCase()
            : undefined
          const sources = slug ? packageSources[slug] : undefined
          const pkg = computePackageDownloads(org)
          return (
            <OrgCard
              key={row.id}
              org={org}
              rank={rank}
              slug={slug}
              quarterId={quarterId}
              pkg={pkg}
              sources={sources}
            />
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-lg border border-white/10 overflow-hidden">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-white/10 hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-[0.65rem] uppercase tracking-widest text-muted-foreground/70 font-semibold py-3",
                      header.id === "rank" && "w-20",
                      header.id === "org" && "w-60",
                      header.id === "gh_stars" && "w-36 pl-4",
                      header.id === "gh_contrib" && "w-40",
                      header.id === "packages" && "w-56",
                      header.id === "links" && "w-16",
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isFirstAvailablePage ? <DesktopRevealTeasers ranks={reveal.teaserRanks} /> : null}
            {table.getRowModel().rows.map((row) => {
              const rank = row.original.division_rank
              return (
                <TableRow
                  key={row.id}
                  data-testid="ranking-entry"
                  data-ranking-rank={rank}
                  className={cn(
                    "border-white/10 transition-colors",
                    rank <= 3 && "border-l-2",
                    rank === 1 && "border-l-[#F4C430]",
                    rank === 2 && "border-l-[#C0C0C0]",
                    rank === 3 && "border-l-[#CD7F32]"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn("py-3", cell.column.id === "gh_stars" && "pl-4")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-2">
        <span
          className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground/60"
          data-testid="rankings-pagination-summary"
        >
          {visiblePageStartRank}–{pageRange.endRank} of {reveal.totalRankCount}
          {reveal.teaserRanks.length > 0 ? " revealed" : ""}
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((current) => current - 1)}
            disabled={isFirstAvailablePage}
            aria-label="Previous rankings page"
            className="h-8 w-8 p-0 cursor-pointer"
          >
            <ChevronLeft size={14} />
          </Button>
          <span
            className="font-mono text-xs text-muted-foreground tabular-nums"
            data-testid="rankings-pagination-page"
          >
            {pageIndex + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((current) => current + 1)}
            disabled={pageIndex === pageCount - 1}
            aria-label="Next rankings page"
            className="h-8 w-8 p-0 cursor-pointer"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
