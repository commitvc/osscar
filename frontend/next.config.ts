import type { NextConfig } from "next";

// ─── Content Security Policy ──────────────────────────────────────────────────
// Strict baseline. Notes:
//   - `script-src` needs 'unsafe-inline' for Next's hydration script.
//     'unsafe-eval' is added in dev only (HMR uses eval).
//   - `connect-src` gets ws:/wss: in dev for HMR.
//   - Turnstile (challenges.cloudflare.com) is allowed for script + frame +
//     connect so the invisible widget can run.
//   - PostHog needs two hosts: the ingestion API (NEXT_PUBLIC_POSTHOG_HOST,
//     e.g. eu.i.posthog.com) for connect-src, and the matching *-assets
//     host (eu-assets.i.posthog.com) for both script-src (lazy-loaded
//     recorder/surveys/toolbar bundles) and connect-src. The -assets host
//     is derived by the same .replace() posthog-js uses internally so
//     switching region only requires updating the env var.
//   - `img-src` is broad (`https:`) because org logos come from many hosts.
//   - `frame-ancestors 'none'` blocks clickjacking of the HTML pages. It does
//     NOT block embedding `/api/badge` as an <img> — X-Frame-Options and
//     frame-ancestors only apply to framed documents, not images.
const isDev = process.env.NODE_ENV !== "production";

const posthogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const posthogAssetsHost = posthogHost.replace(
  ".i.posthog.com",
  "-assets.i.posthog.com"
);

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "https://challenges.cloudflare.com",
  posthogAssetsHost,
  ...(isDev ? ["'unsafe-eval'"] : []),
];

const connectSrc = [
  "'self'",
  "https://challenges.cloudflare.com",
  posthogHost,
  posthogAssetsHost,
  ...(isDev ? ["ws:", "wss:"] : []),
];

const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  `script-src ${scriptSrc.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src ${connectSrc.join(" ")}`,
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  // HSTS — 2 years, preload-ready. Meaningful only over HTTPS.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: csp },
];

// Badge + OG are PNGs meant to be embedded in third-party READMEs / sites.
// CSP and X-Frame-Options on an image response are inert (browsers apply
// those directives only to HTML-rendered documents), so we don't need to
// remove them — but we DO want to mark the resources as cross-origin-safe
// so pages loading them under COEP / CORP policies don't get blocked.
//
// We also set long public cache here (rather than via the route's
// `ImageResponse({ headers })` option, which would suppress Next's
// config-level header merging and strip our security headers).
const embedImageOverrides = [
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  { key: "Cache-Control", value: "public, max-age=86400, s-maxage=86400" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.crunchbase.com" },
    ],
  },
  async headers() {
    return [
      // 1. Baseline for every path.
      { source: "/:path*", headers: securityHeaders },
      // 2. Cross-origin override for embed-image routes (applied last → wins
      //    on the CORP key; other security headers remain intact).
      { source: "/api/badge", headers: embedImageOverrides },
      { source: "/api/badge/:path*", headers: embedImageOverrides },
      { source: "/api/og", headers: embedImageOverrides },
      { source: "/api/og/:path*", headers: embedImageOverrides },
    ];
  },
};

export default nextConfig;
