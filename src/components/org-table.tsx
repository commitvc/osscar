"use client"

import { useState } from "react"
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
import type { OrgEntry, Tier } from "@/types"
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

const TIER_LABELS: Record<Tier, string> = {
  above_1000: "Heavyweight",
  below_1000: "Lightweight",
}

const RANK_PIPS: Record<number, string> = {
  1: "#F4C430",
  2: "#C0C0C0",
  3: "#CD7F32",
}

function countryFlag(country: string | null): string {
  if (!country) return ""
  const map: Record<string, string> = {
    "United States": "🇺🇸", "Germany": "🇩🇪", "United Kingdom": "🇬🇧",
    "France": "🇫🇷", "Canada": "🇨🇦", "China": "🇨🇳", "India": "🇮🇳",
    "Japan": "🇯🇵", "Israel": "🇮🇱", "Australia": "🇦🇺", "Netherlands": "🇳🇱",
    "Switzerland": "🇨🇭", "Sweden": "🇸🇪", "Norway": "🇳🇴", "Finland": "🇫🇮",
    "Denmark": "🇩🇰", "Brazil": "🇧🇷", "Singapore": "🇸🇬", "South Korea": "🇰🇷",
    "Spain": "🇪🇸", "Italy": "🇮🇹", "Poland": "🇵🇱", "Russia": "🇷🇺",
    "Ukraine": "🇺🇦", "Austria": "🇦🇹", "Belgium": "🇧🇪", "Czech Republic": "🇨🇿",
    "Portugal": "🇵🇹", "Taiwan": "🇹🇼", "Hong Kong": "🇭🇰", "New Zealand": "🇳🇿",
    "Mexico": "🇲🇽", "Argentina": "🇦🇷", "Chile": "🇨🇱", "Colombia": "🇨🇴",
    "Turkey": "🇹🇷", "South Africa": "🇿🇦", "Nigeria": "🇳🇬", "Egypt": "🇪🇬",
    "United Arab Emirates": "🇦🇪", "Romania": "🇷🇴", "Hungary": "🇭🇺",
    "Greece": "🇬🇷", "Ireland": "🇮🇪", "Indonesia": "🇮🇩", "Pakistan": "🇵🇰",
    "Bangladesh": "🇧🇩", "Vietnam": "🇻🇳", "Thailand": "🇹🇭", "Malaysia": "🇲🇾",
    "Philippines": "🇵🇭",
  }
  return map[country] ?? ""
}

interface MetricCellProps {
  value: number | null
  rate: number | null
}

function MetricCell({ value, rate }: MetricCellProps) {
  const hasData = value != null || rate != null
  if (!hasData) {
    return (
      <div className="flex flex-col items-end justify-center h-9">
        <span className="font-mono text-sm text-muted-foreground/25">—</span>
      </div>
    )
  }

  const rateSign = rate != null
    ? (rate > 0 ? "positive" : rate < 0 ? "negative" : "zero")
    : "none"

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="font-mono text-sm font-semibold text-foreground tabular-nums leading-none">
        {value != null ? formatCompact(value) : "—"}
      </span>
      {rate != null ? (
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

function SortHeader({ column, label }: { column: Column<OrgEntry, number | null>; label: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      onClick={column.getToggleSortingHandler()}
      className="flex items-center gap-1 ml-auto cursor-pointer select-none group"
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
  )
}

const columnHelper = createColumnHelper<OrgEntry>()

interface OrgTableProps {
  above: OrgEntry[]
  below: OrgEntry[]
}

export function OrgTable({ above, below }: OrgTableProps) {
  const [activeTier, setActiveTier] = useState<Tier>("above_1000")
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = [
    columnHelper.display({
      id: "rank",
      header: "#",
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination
        const rank = pageIndex * pageSize + row.index + 1
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
    columnHelper.display({
      id: "org",
      header: "Organization",
      cell: ({ row }) => {
        const org = row.original
        const flag = countryFlag(org.country)
        return (
          <div className="flex items-start gap-2.5">
            <OrgLogo logoUrl={org.logo_url} name={org.company_name} size={24} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <a
                href={org.github_owner_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sm text-foreground hover:text-brand transition-colors truncate leading-snug flex items-baseline gap-1 cursor-pointer"
              >
                <span className="truncate">{org.company_name}</span>
                {flag && <span className="text-[0.85em] shrink-0">{flag}</span>}
              </a>
              {org.description ? (
                <Tooltip.Root>
                  <Tooltip.Trigger
                    className="text-xs text-muted-foreground block truncate leading-snug w-full text-left cursor-default"
                  >
                    {org.description}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner side="bottom" align="start" sideOffset={6}>
                      <Tooltip.Popup className="z-50 max-w-xs rounded-md border border-white/10 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
                        {org.description}
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
    columnHelper.accessor(row => row.github_stars_growth_rate, {
      id: "gh_stars",
      sortUndefined: 1,
      sortDescFirst: true,
      header: ({ column }) => <SortHeader column={column} label="STARS" />,
      cell: ({ row }) => (
        <MetricCell
          value={row.original.github_stars_end}
          rate={row.original.github_stars_growth_rate}
        />
      ),
    }),
    columnHelper.accessor(row => row.github_contributors_growth_rate, {
      id: "gh_contrib",
      sortUndefined: 1,
      sortDescFirst: true,
      header: ({ column }) => <SortHeader column={column} label="CONTRIBUTORS" />,
      cell: ({ row }) => (
        <MetricCell
          value={row.original.github_contributors_end}
          rate={row.original.github_contributors_growth_rate}
        />
      ),
    }),
    columnHelper.accessor(row => row.npm_downloads_growth_rate, {
      id: "npm",
      sortUndefined: 1,
      sortDescFirst: true,
      header: ({ column }) => <SortHeader column={column} label="NPM DOWNLOADS" />,
      cell: ({ row }) => (
        <MetricCell
          value={row.original.npm_downloads_end}
          rate={row.original.npm_downloads_growth_rate}
        />
      ),
    }),
    columnHelper.accessor(row => row.pypi_downloads_growth_rate, {
      id: "pypi",
      sortUndefined: 1,
      sortDescFirst: true,
      header: ({ column }) => <SortHeader column={column} label="PYPI DOWNLOADS" />,
      cell: ({ row }) => (
        <MetricCell
          value={row.original.pypi_downloads_end}
          rate={row.original.pypi_downloads_growth_rate}
        />
      ),
    }),
    columnHelper.accessor(
      row => row.huggingface_downloads_growth_rate ?? row.huggingface_likes_growth_rate,
      {
        id: "hf",
        sortUndefined: 1,
        sortDescFirst: true,
        header: ({ column }) => <SortHeader column={column} label="HUGGING FACE" />,
        cell: ({ row }) => {
          const org = row.original
          const value = org.huggingface_downloads_end ?? org.huggingface_likes_end
          const rate = org.huggingface_downloads_growth_rate ?? org.huggingface_likes_growth_rate
          return <MetricCell value={value} rate={rate} />
        },
      }
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
            {org.github_owner_url && (
              <a
                href={org.github_owner_url}
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
  ]

  const table = useReactTable({
    data: activeTier === "above_1000" ? above : below,
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
  const activeData = activeTier === "above_1000" ? above : below

  function handleTierChange(tier: Tier) {
    setActiveTier(tier)
    table.setPageIndex(0)
  }

  return (
    <div className="space-y-4">
      {/* Tier selector */}
      <div className="flex gap-6 border-b border-white/10">
        {(["above_1000", "below_1000"] as Tier[]).map((tier) => (
          <button
            key={tier}
            onClick={() => handleTierChange(tier)}
            className={cn(
              "pb-3 text-xs uppercase tracking-widest font-semibold transition-colors -mb-px cursor-pointer",
              activeTier === tier
                ? "border-b-2 border-brand text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {TIER_LABELS[tier]}
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
                      header.id === "rank" && "w-12",
                      header.id === "org" && "w-72",
                      header.id === "gh_stars" && "w-32 pl-4",
                      header.id === "gh_contrib" && "w-36",
                      header.id === "npm" && "w-36",
                      header.id === "pypi" && "w-36",
                      header.id === "hf" && "w-36",
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
              const rank = pageIndex * pageSize + row.index + 1
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
