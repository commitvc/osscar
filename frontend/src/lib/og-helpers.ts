import fs from "fs";
import path from "path";

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
