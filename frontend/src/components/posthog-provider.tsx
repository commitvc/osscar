"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import posthog from "posthog-js";

// Public key + host are safe to expose client-side (PostHog project keys are
// write-only, same as the teaser site at github.com/commitvc/osscar-teaser).
// Missing key → provider no-ops, so local dev without .env.local still works.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // 'identified_only' = profiles are only created when we call identify()
    // (e.g. on /api/request-score submit). Anonymous traffic still produces
    // pageviews, autocapture, and session events.
    person_profiles: "identified_only",
    // We fire $pageview manually from <PageviewTracker> because App Router
    // client navigations don't trigger a full page load and PostHog's
    // auto-capture can't detect them reliably.
    capture_pageview: false,
    capture_pageleave: true,
  });
}

export function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!POSTHOG_KEY) return <>{children}</>;
  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  );
}

// useSearchParams() must live under a <Suspense> boundary (Next.js 15+
// requirement), which is why this is split out.
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    const url = window.location.origin + pathname + (qs ? `?${qs}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
