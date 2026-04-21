import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Org } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function computeScore(org: Org): number {
  return [
    org.github_stars_final_weight,
    org.github_contributors_final_weight,
    org.package_downloads_final_weight,
  ].reduce<number>((sum, w) => sum + (w ?? 0), 0)
}

export function formatScore(n: number): string {
  return n.toFixed(3)
}

export function formatCompact(n: number | null): string {
  if (n == null) return "—"
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return v % 1 === 0 ? `${v}M` : `${v.toFixed(1)}M`
  }
  if (n >= 1_000) {
    const v = n / 1_000
    return v % 1 === 0 ? `${v}K` : `${v.toFixed(1)}K`
  }
  return String(Math.round(n))
}

export function formatGrowthRate(rate: number | null): string {
  if (rate == null) return "—"
  const sign = rate >= 0 ? "+" : ""
  return `${sign}${rate.toFixed(1)}×`
}

function ordinalSuffix(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return "th"
  const mod10 = n % 10
  if (mod10 === 1) return "st"
  if (mod10 === 2) return "nd"
  if (mod10 === 3) return "rd"
  return "th"
}

export function formatPercentile(p: number | null): string | null {
  if (p == null) return null
  const rounded = Math.max(1, Math.min(100, Math.round(p)))
  return `${rounded}${ordinalSuffix(rounded)} percentile`
}

export function formatTopPct(p: number | null): string | null {
  if (p == null) return null
  const top = Math.max(1, Math.round(100 - p))
  return `top ${top}%`
}
