import fs from "fs";
import path from "path";

// ─── Rank helpers ─────────────────────────────────────────────────────────────

export function getTopN(rank: number): number {
  if (rank === 1) return 1;
  if (rank === 2) return 2;
  if (rank <= 3) return 3;
  if (rank <= 10) return 10;
  if (rank <= 20) return 20;
  if (rank <= 50) return 50;
  if (rank <= 100) return 100;
  if (rank <= 500) return 500;
  return 1000;
}

export function getRankColor(rank: number): string {
  if (rank === 1) return "#F0B429";   // amber
  if (rank === 2) return "#C8D0DA";   // silver
  if (rank === 3) return "#C87941";   // bronze
  return "#D9D9D9";                    // white for the rest
}

export function getOscarFile(rank: number): string {
  if (rank === 1) return "oscar-amber.png";
  if (rank === 2) return "oscar-silver.png";
  if (rank === 3) return "oscar-bronze.png";
  return "oscar-white.png";
}

/** Returns "#1", "#2", "#3" for top 3, "Top N" otherwise */
export function getRankLabel(rank: number): string {
  if (rank <= 3) return `#${rank}`;
  return `Top ${getTopN(rank)}`;
}

// ─── Font loader ──────────────────────────────────────────────────────────────

let interBoldData: ArrayBuffer | null = null;

export async function getInterBold(): Promise<ArrayBuffer | null> {
  if (interBoldData) return interBoldData;
  try {
    const fontPath = path.join(
      process.cwd(),
      "src",
      "app",
      "api",
      "og",
      "Inter-Bold.ttf"
    );
    interBoldData = fs.readFileSync(fontPath).buffer as ArrayBuffer;
    return interBoldData;
  } catch {
    return null;
  }
}

// ─── Asset loader ─────────────────────────────────────────────────────────────

export function readPublicAsBase64(filename: string, mime: string): string {
  const buf = fs.readFileSync(path.join(process.cwd(), "public", filename));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/png";
    return `data:${contentType};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return null;
  }
}
