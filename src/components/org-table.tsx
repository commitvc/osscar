"use client"

import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table"
import { ExternalLink, Github, ChevronLeft, ChevronRight } from "lucide-react"
import type { OrgEntry, Tier } from "@/types"
import { computeScore, formatScore, formatCompact, formatGrowthRate, cn } from "@/lib/utils"
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
  // ISO 3166-1 alpha-2 lookup for common countries in the dataset
  const map: Record<string, string> = {
    "United States": "🇺🇸",
    "Germany": "🇩🇪",
    "United Kingdom": "🇬🇧",
    "France": "🇫🇷",
    "Canada": "🇨🇦",
    "China": "🇨🇳",
    "India": "🇮🇳",
    "Japan": "🇯🇵",
    "Israel": "🇮🇱",
    "Australia": "🇦🇺",
    "Netherlands": "🇳🇱",
    "Switzerland": "🇨🇭",
    "Sweden": "🇸🇪",
    "Norway": "🇳🇴",
    "Finland": "🇫🇮",
    "Denmark": "🇩🇰",
    "Brazil": "🇧🇷",
    "Singapore": "🇸🇬",
    "South Korea": "🇰🇷",
    "Spain": "🇪🇸",
    "Italy": "🇮🇹",
    "Poland": "🇵🇱",
    "Russia": "🇷🇺",
    "Ukraine": "🇺🇦",
    "Austria": "🇦🇹",
    "Belgium": "🇧🇪",
    "Czech Republic": "🇨🇿",
    "Portugal": "🇵🇹",
    "Taiwan": "🇹🇼",
    "Hong Kong": "🇭🇰",
    "New Zealand": "🇳🇿",
    "Mexico": "🇲🇽",
    "Argentina": "🇦🇷",
    "Chile": "🇨🇱",
    "Colombia": "🇨🇴",
    "Turkey": "🇹🇷",
    "South Africa": "🇿🇦",
    "Nigeria": "🇳🇬",
    "Egypt": "🇪🇬",
    "United Arab Emirates": "🇦🇪",
    "Romania": "🇷🇴",
    "Hungary": "🇭🇺",
    "Greece": "🇬🇷",
    "Ireland": "🇮🇪",
    "Indonesia": "🇮🇩",
    "Pakistan": "🇵🇰",
    "Bangladesh": "🇧🇩",
    "Vietnam": "🇻🇳",
    "Thailand": "🇹🇭",
    "Malaysia": "🇲🇾",
    "Philippines": "🇵🇭",
  }
  return map[country] ?? ""
}

const columnHelper = createColumnHelper<OrgEntry>()

interface OrgTableProps {
  above: OrgEntry[]
  below: OrgEntry[]
}

export function OrgTable({ above, below }: OrgTableProps) {
  const [activeTier, setActiveTier] = useState<Tier>("above_1000")

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
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: pip }}
              />
            ) : (
              <span className="size-1.5 shrink-0" />
            )}
            <span
              className={cn(
                "font-mono text-sm tabular-nums",
                rank <= 3
                  ? "text-foreground font-semibold"
                  : rank <= 10
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
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
          <div className="flex items-center gap-2.5 min-w-0">
            <OrgLogo logoUrl={org.logo_url} name={org.company_name} size={24} />
            <div className="min-w-0">
              <a
                href={org.github_owner_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sm text-foreground hover:text-brand transition-colors truncate block"
              >
                {org.company_name}
              </a>
              {org.country && (
                <span className="text-xs text-muted-foreground">
                  {flag} {org.country}
                </span>
              )}
            </div>
          </div>
        )
      },
    }),
    columnHelper.display({
      id: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
          {row.original.description ?? "—"}
        </span>
      ),
    }),
    columnHelper.display({
      id: "score",
      header: () => <span className="text-right block">Score</span>,
      cell: ({ row }) => (
        <span className="font-mono text-sm text-brand tabular-nums text-right block">
          {formatScore(computeScore(row.original))}
        </span>
      ),
    }),
    columnHelper.display({
      id: "stars",
      header: () => <span className="text-right block">Stars</span>,
      cell: ({ row }) => (
        <span className="font-mono text-sm tabular-nums text-right block text-foreground">
          {formatCompact(row.original.github_stars_end)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "star_growth",
      header: () => <span className="text-right block">Star Growth</span>,
      cell: ({ row }) => {
        const rate = row.original.github_stars_growth_rate
        const formatted = formatGrowthRate(rate)
        return (
          <span
            className={cn(
              "font-mono text-sm tabular-nums text-right block",
              rate != null && rate >= 0 ? "text-brand" : "text-destructive"
            )}
          >
            {formatted}
          </span>
        )
      },
    }),
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
                className="text-muted-foreground hover:text-foreground transition-colors"
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
                className="text-muted-foreground hover:text-foreground transition-colors"
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
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()

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
              "pb-3 text-xs uppercase tracking-widest font-semibold transition-colors -mb-px",
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
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-white/10 hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "text-[0.65rem] uppercase tracking-widest text-muted-foreground/70 font-semibold py-3",
                      header.id === "rank" && "w-14",
                      header.id === "org" && "w-52",
                      header.id === "score" && "w-24",
                      header.id === "stars" && "w-20",
                      header.id === "star_growth" && "w-24",
                      header.id === "links" && "w-20",
                      header.id === "description" && "hidden md:table-cell"
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
                      className={cn(
                        "py-3",
                        cell.column.id === "description" && "hidden md:table-cell"
                      )}
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
          {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, (activeTier === "above_1000" ? above : below).length)}{" "}
          of {(activeTier === "above_1000" ? above : below).length}
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0"
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
            className="h-8 w-8 p-0"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
