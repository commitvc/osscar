import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { OrgEntry } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function computeScore(org: OrgEntry): number {
  return [
    org.github_stars_final_weight,
    org.github_contributors_final_weight,
    org.npm_downloads_final_weight,
    org.pypi_downloads_final_weight,
    org.cargo_downloads_final_weight,
    org.docker_pulls_final_weight,
  ].reduce<number>((sum, w) => sum + (w ?? 0), 0)
}

export function formatScore(n: number): string {
  return n.toFixed(3)
}

export function formatCompact(n: number | null): string {
  if (n == null) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}

export function formatGrowthRate(rate: number | null): string {
  if (rate == null) return "—"
  const sign = rate >= 0 ? "+" : ""
  return `${sign}${rate.toFixed(1)}×`
}
