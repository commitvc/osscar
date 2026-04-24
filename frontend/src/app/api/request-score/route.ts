import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { render } from "@react-email/render";
import { createElement } from "react";
import { Resend } from "resend";
import { z } from "zod";

import ScoreReportEmail, {
  type ScoreReportEmailProps,
} from "@/emails/score-report";
import NotFoundEmail, {
  type NotFoundEmailProps,
} from "@/emails/not-found";
import { normalizeLogin } from "@/lib/normalize-login";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/request-score
 *
 * Lead-capture endpoint: visitor submits a GitHub org + email, we look the
 * org up in the current-quarter ranking and email them a one-page report
 * (or a polite "not in dataset" note). Every submission is captured to the
 * `score_requests` table.
 *
 * Trust model:
 *   - Turnstile blocks browserless scraping / harvesting.
 *   - Honeypot `company_website` blocks trivial form-fillers.
 *   - Rate limits (per-email/day, per-IP-hash/day, per-email+login/quarter)
 *     cap abuse from real browsers behind rotated tokens.
 *   - Service-role DB access; RLS is on for defense-in-depth.
 *
 * Response is always `{ ok, status }` — we return 200 even for rate-limited
 * or honeypot-tripped submissions so the client UI shows the same
 * "check your inbox" message either way (don't tell attackers what tripped).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Config ──────────────────────────────────────────────────────────────────

const EMAIL_PER_DAY = num(process.env.RATE_LIMIT_EMAIL_PER_DAY, 3);
const IP_PER_DAY = num(process.env.RATE_LIMIT_IP_PER_DAY, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

function num(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ─── Request schema ──────────────────────────────────────────────────────────

const BodySchema = z.object({
  orgInput: z.string().min(1).max(200),
  email: z.string().email().max(254),
  turnstileToken: z.string().min(1).max(4096).nullable().optional(),
  // Honeypot — legitimate submissions leave this empty; bots fill every field.
  companyWebsite: z.string().max(1000).optional(),
});

export type RequestScoreStatus =
  | "sent"
  | "not_found"
  | "rate_limited"
  | "invalid_input"
  | "error";

type Body = z.infer<typeof BodySchema>;

// ─── Current-quarter cache (60s) ─────────────────────────────────────────────

type CurrentQuarter = {
  id: string;
  label: string;
  quarter_start: string;
  quarter_end: string;
};

let quarterCache: { value: CurrentQuarter; expires: number } | null = null;

async function getCurrentQuarter(): Promise<CurrentQuarter | null> {
  if (quarterCache && quarterCache.expires > Date.now()) {
    return quarterCache.value;
  }
  const { data, error } = await getSupabaseAdmin()
    .from("quarters")
    .select("id, label, quarter_start, quarter_end")
    .eq("is_current", true)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  quarterCache = { value: data, expires: Date.now() + 60_000 };
  return data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * "We're running in a production Vercel deployment". Previews and local dev
 * are treated as non-production so contributors can test without setting up
 * Turnstile / SITE_URL. NODE_ENV === "production" is a fallback for self-hosts
 * that don't set VERCEL_ENV.
 */
function isProduction(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    (process.env.VERCEL_ENV == null && process.env.NODE_ENV === "production")
  );
}

/**
 * Same-origin check for POST. Modern browsers always send `Origin` on POST,
 * so requiring it in production cheaply blocks cross-site form submissions
 * from a page a visitor might browse — without needing a CSRF token.
 *
 * Preview deployments: also accept `VERCEL_URL` so preview URLs (which have
 * randomized subdomains) can hit their own endpoint. Local dev: no origin
 * enforcement.
 */
function isAllowedOrigin(req: NextRequest): boolean {
  // In dev / preview without a configured SITE_URL, don't enforce. Keeps
  // `next dev` and ad-hoc preview deploys usable without extra setup.
  if (!isProduction() && !process.env.VERCEL_URL) return true;

  const originHeader = req.headers.get("origin");
  const refererHeader = req.headers.get("referer");

  let origin: string | null = originHeader;
  if (!origin && refererHeader) {
    try {
      origin = new URL(refererHeader).origin;
    } catch {
      origin = null;
    }
  }
  if (!origin) return false;

  const allowed = new Set<string>();
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    } catch {
      // malformed env — ignored
    }
  }
  if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);

  return allowed.has(origin);
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function hashIp(ip: string): Promise<string> {
  // Daily-rotating salt: same IP across days produces different hashes, so
  // the column can't be used for long-term cross-day correlation.
  const salt = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyTurnstile(
  token: string | null | undefined,
  ip: string,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // In production, a missing secret means Turnstile is unconfigured — fail
    // closed so a misconfigured deploy doesn't silently become an open relay.
    // In dev/preview without the key set, we allow through so the feature can
    // be built/tested locally.
    if (isProduction()) {
      console.error(
        "[request-score] TURNSTILE_SECRET_KEY unset in production — rejecting.",
      );
      return { ok: false, reason: "turnstile-unconfigured" };
    }
    console.warn(
      "[request-score] TURNSTILE_SECRET_KEY unset — skipping bot verification (dev only).",
    );
    return { ok: true };
  }
  if (!token) return { ok: false, reason: "missing-token" };

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: ip,
        }),
        // Turnstile is on the request path — fail closed quickly if it's slow.
        signal: AbortSignal.timeout(4000),
      },
    );
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (!data.success) {
      return { ok: false, reason: data["error-codes"]?.join(",") ?? "verify-failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[request-score] Turnstile verify error", err);
    return { ok: false, reason: "verify-error" };
  }
}

/** Count rows in a trailing window — for per-email / per-ip daily limits. */
async function countSince(
  column: "email" | "ip_hash",
  value: string,
  sinceMs: number,
): Promise<number> {
  const since = new Date(Date.now() - sinceMs).toISOString();
  const { count, error } = await getSupabaseAdmin()
    .from("score_requests")
    .select("id", { count: "exact", head: true })
    .eq(column, value)
    .gte("created_at", since);
  if (error) {
    console.error("[request-score] count error", column, error);
    return 0; // Fail open on DB read errors — the send itself still guards.
  }
  return count ?? 0;
}

/** Has this (email, login) already received a 'sent' or 'not_found' this quarter? */
async function alreadyServedThisQuarter(
  email: string,
  login: string,
  quarterId: string,
): Promise<boolean> {
  const { count, error } = await getSupabaseAdmin()
    .from("score_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("normalized_login", login)
    .eq("matched_quarter_id", quarterId)
    .in("status", ["sent", "not_found"]);
  if (error) {
    console.error("[request-score] dup check error", error);
    return false;
  }
  return (count ?? 0) > 0;
}

type OrgRow = {
  owner_id: string;
  owner_login: string;
  owner_name: string | null;
  owner_url: string | null;
  owner_logo: string | null;
  owner_description: string | null;
  homepage_url: string | null;
  division: "emerging" | "scaling";
  division_rank: number;
  division_size: number;
  github_stars_start: number | null;
  github_stars_end: number | null;
  github_stars_growth_rate: number | null;
  github_contributors_start: number | null;
  github_contributors_end: number | null;
  github_contributors_growth_rate: number | null;
  package_downloads_start: number | null;
  package_downloads_end: number | null;
  package_downloads_growth_rate: number | null;
};

async function findOrg(
  quarterId: string,
  login: string,
): Promise<OrgRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("organizations_full")
    .select(
      "owner_id, owner_login, owner_name, owner_url, owner_logo, owner_description, homepage_url, division, division_rank, division_size, github_stars_start, github_stars_end, github_stars_growth_rate, github_contributors_start, github_contributors_end, github_contributors_growth_rate, package_downloads_start, package_downloads_end, package_downloads_growth_rate",
    )
    .eq("quarter_id", quarterId)
    // GitHub logins are case-insensitive; owner_login is stored as reported
    // by GitHub (mixed case), while `login` is normalized to lowercase.
    .ilike("owner_login", login)
    .limit(1)
    .maybeSingle();
  if (error) {
    // PostgREST returns a specific code when .maybeSingle() finds nothing;
    // anything else is a real failure.
    if (error.code !== "PGRST116") {
      console.error("[request-score] org lookup error", error);
    }
    return null;
  }
  return (data as OrgRow | null) ?? null;
}

function toScoreEmailProps(
  org: OrgRow,
  quarterLabel: string,
): ScoreReportEmailProps {
  return {
    quarterLabel,
    division: org.division,
    divisionRank: org.division_rank,
    divisionSize: org.division_size,
    ownerLogin: org.owner_login,
    ownerName: org.owner_name,
    ownerLogo: org.owner_logo,
    ownerDescription: org.owner_description,
    ownerUrl: org.owner_url,
    homepageUrl: org.homepage_url,
    stars: {
      start: org.github_stars_start,
      end: org.github_stars_end,
      growthRate: org.github_stars_growth_rate,
    },
    contributors: {
      start: org.github_contributors_start,
      end: org.github_contributors_end,
      growthRate: org.github_contributors_growth_rate,
    },
    downloads: {
      start: org.package_downloads_start,
      end: org.package_downloads_end,
      growthRate: org.package_downloads_growth_rate,
    },
  };
}

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.RESEND_FROM ?? "OSSCAR <onboarding@resend.dev>";
}

// ─── Logos (inline CID attachments) ───────────────────────────────────────────
// We attach each logo as a MIME part with a `contentId` and reference it via
// `<img src="cid:<id>">` in the email HTML. This is the standard email
// approach — works in Gmail, Apple Mail, Outlook, iOS Mail — and avoids
// depending on any external image hosting (our public asset isn't live at
// osscar.dev yet, and GitHub raw requires auth since the repo is private).
// Lazy-loaded once per process, per file.
type InlineLogo = { filename: string; contentId: string; publicFile: string };

const INLINE_LOGOS: readonly InlineLogo[] = [
  { filename: "osscar-logo.png", contentId: "osscar-logo", publicFile: "osscar-logo-icon-white.png" },
  { filename: "supabase-logo.png", contentId: "supabase-logo", publicFile: "supabase-logo-wordmark--dark.png" },
  { filename: "commit-logo.png", contentId: "commit-logo", publicFile: "commit-logo-dark.png" },
];

const _logoBufCache = new Map<string, Buffer>();
function loadLogoBuffer(publicFile: string): Buffer | null {
  const cached = _logoBufCache.get(publicFile);
  if (cached) return cached;
  try {
    const p = path.join(process.cwd(), "public", publicFile);
    const buf = fs.readFileSync(p);
    _logoBufCache.set(publicFile, buf);
    return buf;
  } catch (err) {
    console.warn(`[request-score] Could not read ${publicFile}; email will ship without it`, err);
    return null;
  }
}

async function sendEmail(
  to: string,
  subject: string,
  reactEl: React.ReactElement,
): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const resend = resendClient();
  if (!resend) {
    console.error("[request-score] RESEND_API_KEY unset; cannot send");
    return { ok: false, error: "resend-unconfigured" };
  }
  const [html, text] = await Promise.all([
    render(reactEl, { pretty: false }),
    render(reactEl, { plainText: true }),
  ]);
  const attachments = INLINE_LOGOS.flatMap((logo) => {
    const buf = loadLogoBuffer(logo.publicFile);
    return buf ? [{ filename: logo.filename, content: buf, contentId: logo.contentId }] : [];
  });
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject,
      html,
      text,
      replyTo: "hello@osscar.dev",
      // Unique per-send token. Defeats Gmail's "Show trimmed content …" UI,
      // which collapses HTML chunks it recognizes from prior messages in a
      // thread — we'd see it hide our signal-breakdown + footer.
      headers: { "X-Entity-Ref-ID": randomUUID() },
      // Inline-attached logos (osscar, supabase, commit), referenced via
      // src="cid:<id>" in the email body. Missing files are skipped — the
      // <img> just renders as a broken placeholder (no crash).
      ...(attachments.length > 0 ? { attachments } : {}),
    });
    if (error) {
      console.error("[request-score] Resend send error", error);
      return { ok: false, error: error.message ?? "send-failed" };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    console.error("[request-score] Resend threw", err);
    return { ok: false, error: "send-threw" };
  }
}

async function insertRequestRow(row: {
  email: string;
  orgInput: string;
  normalizedLogin: string | null;
  matchedOwnerId: string | null;
  matchedQuarterId: string | null;
  status: RequestScoreStatus;
  ipHash: string;
  userAgent: string | null;
}): Promise<void> {
  const { error } = await getSupabaseAdmin().from("score_requests").insert({
    email: row.email,
    org_input: row.orgInput,
    normalized_login: row.normalizedLogin,
    matched_owner_id: row.matchedOwnerId,
    matched_quarter_id: row.matchedQuarterId,
    status: row.status,
    ip_hash: row.ipHash,
    user_agent: row.userAgent,
  });
  if (error) {
    // Not fatal — we've already sent the email — but log loudly.
    console.error("[request-score] insert row failed", error);
  }
}

function json(body: { ok: boolean; status: RequestScoreStatus }, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 0. Same-origin check. Cross-site POSTs get the same response shape as a
  //    malformed body so attackers can't probe the allowlist.
  if (!isAllowedOrigin(req)) {
    return json({ ok: false, status: "invalid_input" }, { status: 400 });
  }

  // 1. Parse + validate.
  let parsed: Body;
  try {
    const raw = await req.json();
    parsed = BodySchema.parse(raw);
  } catch {
    return json({ ok: false, status: "invalid_input" }, { status: 400 });
  }
  const { orgInput, email, turnstileToken, companyWebsite } = parsed;
  const normalizedEmail = email.trim().toLowerCase();

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);
  const userAgent = req.headers.get("user-agent");

  // 2. Honeypot tripped → silent success; do not touch DB, Resend, or anything else.
  if (companyWebsite && companyWebsite.trim().length > 0) {
    return json({ ok: true, status: "sent" });
  }

  // 3. Turnstile (dev-bypasses when secret unset).
  const turnstile = await verifyTurnstile(turnstileToken, ip);
  if (!turnstile.ok) {
    return json({ ok: false, status: "invalid_input" }, { status: 400 });
  }

  // 4. Normalize the org input.
  const login = normalizeLogin(orgInput);
  if (!login) {
    // Don't spend a Resend send on malformed input. Still capture the attempt
    // so we can see real users fat-fingering.
    await insertRequestRow({
      email: normalizedEmail,
      orgInput,
      normalizedLogin: null,
      matchedOwnerId: null,
      matchedQuarterId: null,
      status: "invalid_input",
      ipHash,
      userAgent,
    });
    return json({ ok: false, status: "invalid_input" }, { status: 400 });
  }

  // 5. Rate limits. In priority order: per-IP (protect against rotating
  //    emails from one attacker), per-email (protect one inbox from spam if
  //    an attacker uses the endpoint to mail-bomb someone), per-(email+login)
  //    (protect the same user from getting duplicate mail this quarter).
  const [ipCount, emailCount] = await Promise.all([
    countSince("ip_hash", ipHash, DAY_MS),
    countSince("email", normalizedEmail, DAY_MS),
  ]);

  if (ipCount >= IP_PER_DAY || emailCount >= EMAIL_PER_DAY) {
    await insertRequestRow({
      email: normalizedEmail,
      orgInput,
      normalizedLogin: login,
      matchedOwnerId: null,
      matchedQuarterId: null,
      status: "rate_limited",
      ipHash,
      userAgent,
    });
    return json({ ok: true, status: "rate_limited" });
  }

  // 6. Current quarter.
  const quarter = await getCurrentQuarter();
  if (!quarter) {
    console.error("[request-score] no current quarter configured");
    return json({ ok: false, status: "error" }, { status: 500 });
  }

  // 7. Dedup: already served this (email, login) this quarter?
  if (await alreadyServedThisQuarter(normalizedEmail, login, quarter.id)) {
    await insertRequestRow({
      email: normalizedEmail,
      orgInput,
      normalizedLogin: login,
      matchedOwnerId: null,
      matchedQuarterId: quarter.id,
      status: "rate_limited",
      ipHash,
      userAgent,
    });
    return json({ ok: true, status: "rate_limited" });
  }

  // 8. Lookup + send.
  const org = await findOrg(quarter.id, login);

  if (org) {
    const props = toScoreEmailProps(org, quarter.label);
    const subject = `Your OSSCAR ${quarter.label} report — #${org.division_rank} in ${org.division === "scaling" ? "Scaling" : "Emerging"}`;
    const result = await sendEmail(
      normalizedEmail,
      subject,
      createElement(ScoreReportEmail, props),
    );
    await insertRequestRow({
      email: normalizedEmail,
      orgInput,
      normalizedLogin: login,
      matchedOwnerId: org.owner_id,
      matchedQuarterId: quarter.id,
      status: result.ok ? "sent" : "error",
      ipHash,
      userAgent,
    });
    return result.ok
      ? json({ ok: true, status: "sent" })
      : json({ ok: false, status: "error" }, { status: 500 });
  }

  // Not found.
  const props: NotFoundEmailProps = {
    quarterLabel: quarter.label,
    orgInput,
  };
  const subject = `OSSCAR ${quarter.label} — we couldn't find "${orgInput}"`;
  const result = await sendEmail(
    normalizedEmail,
    subject,
    createElement(NotFoundEmail, props),
  );
  await insertRequestRow({
    email: normalizedEmail,
    orgInput,
    normalizedLogin: login,
    matchedOwnerId: null,
    matchedQuarterId: quarter.id,
    status: result.ok ? "not_found" : "error",
    ipHash,
    userAgent,
  });
  return result.ok
    ? json({ ok: true, status: "not_found" })
    : json({ ok: false, status: "error" }, { status: 500 });
}

// Reject non-POST verbs cleanly so misdirected traffic gets a 405 instead
// of Next's default "method not allowed" HTML page.
export async function GET() {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { allow: "POST" },
  });
}
