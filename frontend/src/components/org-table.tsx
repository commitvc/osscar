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
import { ExternalLink, Github, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { Tooltip } from "@base-ui/react/tooltip"
import type { Org, Division } from "@/types"
import { formatCompact, formatGrowthRate, cn } from "@/lib/utils"
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

function computePackageDownloads(org: Org): { value: number | null; rate: number | null } {
  if (org.package_downloads_end == null) return { value: null, rate: null }
  return {
    value: org.package_downloads_end,
    rate: org.package_downloads_growth_rate,
  }
}

const LOW_BASELINE_THRESHOLD = 100

interface MetricCellProps {
  value: number | null
  rate: number | null
  startValue?: number | null
  metricLabel?: string
}

function MetricCell({ value, rate, startValue, metricLabel = "stars" }: MetricCellProps) {
  const hasData = value != null || rate != null
  if (!hasData) {
    return (
      <div className="flex flex-col items-end justify-center h-9">
        <span className="font-mono text-sm text-muted-foreground/25">—</span>
      </div>
    )
  }

  const isLowBaseline = startValue != null && startValue < LOW_BASELINE_THRESHOLD && rate != null

  // Low-baseline orgs: show methodology rate in table, real growth in tooltip
  if (isLowBaseline) {
    const realRateLabel = startValue === 0 || startValue == null
      ? "+∞"
      : value != null && startValue > 0
        ? `+${((value - startValue) / startValue).toFixed(1)}×`
        : "—"

    return (
      <Tooltip.Root>
        <Tooltip.Trigger className="cursor-default w-full">
          <div className="flex items-center justify-end gap-1.5">
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
                Real growth is <span className="font-semibold text-green">{realRateLabel}</span> ({formatCompact(startValue ?? 0)} → {formatCompact(value)}). Our methodology uses a minimum baseline of 100 {metricLabel}, so the displayed rate is computed as 100 → {formatCompact(value)}, giving <span className="font-semibold text-green">{formatGrowthRate(rate)}</span>.
              </p>
              <a href="/methodology" className="inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground hover:text-green transition-colors font-mono">
                Read the methodology →
              </a>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    )
  }

  // Normal display
  const rateSign = rate != null
    ? (rate > 0 ? "positive" : rate < 0 ? "negative" : "zero")
    : "none"

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="font-mono text-sm font-semibold text-foreground tabular-nums leading-none">
        {value != null ? formatCompact(value) : "—"}
      </span>
      {rate != null && rate > 0 ? (
        <span className={cn(
          "font-mono text-[0.7rem] font-semibold tabular-nums leading-none px-1.5 py-0.5 rounded-sm",
          rateSign === "positive" && "bg-green/15 text-green",
          rateSign === "negative" && "bg-brand/15 text-brand",
          rateSign === "zero" && "text-muted-foreground/40",
        )}>
          {formatGrowthRate(rate)}
        </span>
      ) : (
        <span className="text-[0.7rem] leading-none text-muted-foreground/25">—</span>
      )}
    </div>
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

interface OrgTableProps {
  emerging: Org[]
  scaling: Org[]
}

export function OrgTable({ emerging, scaling }: OrgTableProps) {
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
            metricLabel="contributors"
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
          const { value, rate } = computePackageDownloads(row.original)
          return <MetricCell value={value} rate={rate} startValue={row.original.package_downloads_start} metricLabel="downloads" />
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

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
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
                      header.id === "packages" && "w-48",
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
