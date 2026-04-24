"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, GitFork, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RepoEntry } from "@/types";
import { formatCompact, cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Lua: "#000080",
  Scala: "#c22d40",
  Haskell: "#5e5086",
  Elixir: "#6e4a7e",
  Nix: "#7e7eff",
};

const columnHelper = createColumnHelper<RepoEntry>();

interface RepoTableProps {
  repos: RepoEntry[];
}

export function RepoTable({ repos }: RepoTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "stars", desc: true },
  ]);

  const columns = [
    columnHelper.accessor("name", {
      id: "name",
      header: "Repository",
      cell: ({ row }) => (
        <a
          href={row.original.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-foreground hover:text-green transition-colors group flex min-w-0 items-center gap-1.5"
        >
          <span className="truncate">{row.original.name}</span>
          <ExternalLink
            size={11}
            className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
          />
        </a>
      ),
    }),
    columnHelper.accessor("stars", {
      id: "stars",
      sortDescFirst: true,
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <button
            onClick={column.getToggleSortingHandler()}
            className="flex items-center gap-1 cursor-pointer select-none group ml-auto"
          >
            <Star size={10} className="text-muted-foreground/60" />
            STARS
            <span
              className={cn(
                "transition-colors",
                sorted
                  ? "text-foreground"
                  : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
              )}
            >
              {sorted === "asc" ? (
                <ChevronUp size={10} />
              ) : sorted === "desc" ? (
                <ChevronDown size={10} />
              ) : (
                <ChevronsUpDown size={10} />
              )}
            </span>
          </button>
        );
      },
      cell: ({ getValue }) => (
        <span className="font-mono text-sm tabular-nums text-foreground">
          {formatCompact(getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("forks", {
      id: "forks",
      sortDescFirst: true,
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <button
            onClick={column.getToggleSortingHandler()}
            className="flex items-center gap-1 cursor-pointer select-none group ml-auto"
          >
            <GitFork size={10} className="text-muted-foreground/60" />
            FORKS
            <span
              className={cn(
                "transition-colors",
                sorted
                  ? "text-foreground"
                  : "text-muted-foreground/30 group-hover:text-muted-foreground/60"
              )}
            >
              {sorted === "asc" ? (
                <ChevronUp size={10} />
              ) : sorted === "desc" ? (
                <ChevronDown size={10} />
              ) : (
                <ChevronsUpDown size={10} />
              )}
            </span>
          </button>
        );
      },
      cell: ({ getValue }) => (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {formatCompact(getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("language", {
      id: "language",
      header: "LANGUAGE",
      cell: ({ getValue }) => {
        const lang = getValue();
        if (!lang) return <span className="text-muted-foreground/25 text-sm">—</span>;
        const color = LANGUAGE_COLORS[lang] ?? "#888";
        return (
          <div className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="font-mono text-xs text-muted-foreground">
              {lang}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor("description", {
      id: "description",
      header: "DESCRIPTION",
      cell: ({ getValue }) => {
        const desc = getValue();
        if (!desc)
          return <span className="text-muted-foreground/25 text-sm">—</span>;
        return (
          <span className="block text-xs leading-relaxed text-muted-foreground/70">
            {desc}
          </span>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: repos,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-3">
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="border-white/10 hover:bg-transparent">
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    "text-[0.6rem] uppercase tracking-widest text-muted-foreground/60 font-semibold py-3",
                    header.id === "name" && "w-36 sm:w-40",
                    header.id === "stars" && "w-20 text-right sm:w-24",
                    header.id === "forks" && "w-20 text-right sm:w-24",
                    header.id === "language" && "w-32 hidden sm:table-cell",
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
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className="border-white/10 hover:bg-muted/30 transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn(
                    "py-3",
                    cell.column.id === "name" && "min-w-0 overflow-hidden",
                    cell.column.id === "stars" && "text-right",
                    cell.column.id === "forks" && "text-right",
                    cell.column.id === "language" && "hidden sm:table-cell",
                    cell.column.id === "description" && "hidden md:table-cell min-w-0 whitespace-normal break-words"
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Pagination */}
    {table.getPageCount() > 1 && (
      <div className="flex items-center justify-between pt-2">
        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground/40">
          {table.getState().pagination.pageIndex * 10 + 1}–
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * 10,
            repos.length
          )}{" "}
          of {repos.length}
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
            {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount()}
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
    )}
  </div>
  );
}
