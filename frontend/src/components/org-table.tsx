"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
  type Column,
} from "@tanstack/react-table"
import { ExternalLink, Github, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Star, Users, Package } from "lucide-react"
import { Tooltip } from "@base-ui/react/tooltip"
import type { Org, Division } from "@/types"
import { formatCompact, formatGrowthRate, formatPercentile, formatTopPct, cn } from "@/lib/utils"
import { PADDING_THRESHOLDS, type MetricKey } from "@/lib/padding-thresholds"
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
  const showRate = rate != null && rate > 0
  const isLowBaseline =
    showRate && startValue != null && startValue < baseline
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
            <span className="font-mono text-[0.7rem] font-semibold tabular-nums leading-none px-1.5 py-0.5 rounded-sm bg-green/15 text-green">
              {formatGrowthRate(rate)}
            </span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" sideOffset={6}>
            <Tooltip.Popup className="z-50 max-w-xs rounded-md border border-white/10 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg space-y-1.5">
              <p>
                Displayed rate is real growth: <span className="font-semibold text-green">{formatGrowthRate(rate)}</span> ({formatCompact(startValue ?? 0)} → {formatCompact(value)}). For ranking, our methodology uses a minimum baseline of {formatCompact(baseline)} {baselineLabel} to avoid low-baseline distortion, so this org is ranked as if it had grown from {formatCompact(baseline)} → {formatCompact(value)}.
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
          {formatGrowthRate(rate)}
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

/** Compute the real growth rate; returns Infinity when start is 0 and end > 0 */
function realGrowth(start: number | null, end: number | null): number | null {
  if (end == null) return null
  if (start == null || start === 0) return end > 0 ? Infinity : null
  return (end - start) / start
}

/** Returns the displayed growth value for sorting — always the methodology rate (what's shown in the table) */
function displayedGrowth(_start: number | null, _end: number | null, methodologyRate: number | null): number | null {
  return methodologyRate
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
  rate: number | null
  sources?: string[]
}

function CardMetricRow({ icon: Icon, label, value, rate, sources }: CardMetricRowProps) {
  const hasData = value != null || rate != null
  const showRate = rate != null && rate > 0
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
        {showRate ? (
          <span className="font-mono text-[0.65rem] font-semibold tabular-nums leading-none px-1.5 py-0.5 rounded-sm bg-green/15 text-green">
            {formatGrowthRate(rate)}
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
  pkg: { value: number | null; rate: number | null; percentile: number | null }
  sources?: string[]
}

function OrgCard({ org, rank, slug, pkg, sources }: OrgCardProps) {
  const pip = RANK_PIPS[rank]
  const rankColor = rank === 1 ? "#F4C430" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : null

  return (
    <div
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
            href={slug ? `/org/${slug}` : "#"}
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
              <Github size={14} />
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
          rate={org.github_stars_growth_rate}
        />
        <CardMetricRow
          icon={Users}
          label="Contributors"
          value={org.github_contributors_end}
          rate={org.github_contributors_growth_rate}
        />
        <CardMetricRow
          icon={Package}
          label="Downloads"
          value={pkg.value}
          rate={pkg.rate}
          sources={sources}
        />
      </div>
    </div>
  )
}

interface OrgTableProps {
  emerging: Org[]
  scaling: Org[]
  packageSources?: Record<string, string[]>
}

export function OrgTable({ emerging, scaling, packageSources = {} }: OrgTableProps) {
  const [activeDivision, setActiveDivision] = useState<Division>("emerging")
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => [
    columnHelper.accessor((_row: Org) => 0 as number, {
      id: "rank",
      enableSorting: true,
      sortingFn: (rowA, rowB) => rowA.index - rowB.index,
      sortDescFirst: false,
      header: ({ column }) => <SortHeader column={column} label="RANKING" align="left" />,
      cell: ({ row }) => {
        const rank = row.index + 1
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
                href={org.owner_url ? `/org/${org.owner_url.trim().replace(/\/$/, "").split("/").pop()?.toLowerCase()}` : "#"}
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
            ? displayedGrowth(rowA.original.github_stars_start, rowA.original.github_stars_end, rowA.original.github_stars_growth_rate)
            : rowA.original.github_stars_end
          const bVal = mode === "growth"
            ? displayedGrowth(rowB.original.github_stars_start, rowB.original.github_stars_end, rowB.original.github_stars_growth_rate)
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
            ? displayedGrowth(rowA.original.github_contributors_start, rowA.original.github_contributors_end, rowA.original.github_contributors_growth_rate)
            : rowA.original.github_contributors_end
          const bVal = mode === "growth"
            ? displayedGrowth(rowB.original.github_contributors_start, rowB.original.github_contributors_end, rowB.original.github_contributors_growth_rate)
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
            aVal = displayedGrowth(aStart || null, aData.value, aData.rate)
            bVal = displayedGrowth(bStart || null, bData.value, bData.rate)
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
                <Github size={14} />
              </a>
            )}
          </div>
        )
      },
    }),
  ], [starsSortMode, contribSortMode, pkgSortMode])

  const table = useReactTable({
    data: activeDivision === "scaling" ? scaling : emerging,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const activeData = activeDivision === "scaling" ? scaling : emerging

  function handleDivisionChange(division: Division) {
    setActiveDivision(division)
    table.setPageIndex(0)
  }

  return (
    <div className="space-y-4">
      {/* Division selector */}
      <div className="flex gap-6 border-b border-white/10">
        {(["emerging", "scaling"] as Division[]).map((division) => (
          <button
            key={division}
            onClick={() => handleDivisionChange(division)}
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

      {/* Mobile/tablet card list */}
      <div className="lg:hidden space-y-2">
        {table.getRowModel().rows.map((row) => {
          const rank = row.index + 1
          const org = row.original
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
            {table.getRowModel().rows.map((row) => {
              const rank = row.index + 1
              return (
                <TableRow
                  key={row.id}
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
        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground/60">
          {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, activeData.length)} of {activeData.length}
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0 cursor-pointer"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {pageIndex + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0 cursor-pointer"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
