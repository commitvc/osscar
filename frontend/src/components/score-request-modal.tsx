"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { X, Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeLogin } from "@/lib/normalize-login";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreRequestModalProps {
  onClose: () => void;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; status: "sent" | "not_found" | "rate_limited" }
  | { kind: "error"; message: string };

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreRequestModal({ onClose }: ScoreRequestModalProps) {
  const [orgInput, setOrgInput] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState(""); // companyWebsite — bots fill this
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const overlayRef = useRef<HTMLDivElement>(null);
  const orgInputRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Live-normalized preview of what we'll look up
  const normalizedPreview = useMemo(
    () => normalizeLogin(orgInput),
    [orgInput],
  );

  // Escape close + body scroll lock + autofocus first input
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    // Autofocus the first input on mount
    orgInputRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "submitting") return;

    setState({ kind: "submitting" });

    try {
      const res = await fetch("/api/request-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgInput,
          email,
          turnstileToken,
          companyWebsite: honeypot,
        }),
      });

      // Try to parse JSON even on non-2xx so we can surface server message.
      let json: { ok?: boolean; status?: string; error?: string } = {};
      try {
        json = await res.json();
      } catch {
        // ignore — will fall through to generic error below
      }

      if (!res.ok) {
        // Reset Turnstile so a retry gets a fresh token
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        setState({
          kind: "error",
          message:
            json.error ??
            (res.status === 429
              ? "Too many requests. Try again later."
              : res.status === 400
                ? "Please check your inputs and try again."
                : "Something went wrong. Please try again."),
        });
        return;
      }

      const status = (json.status ?? "sent") as
        | "sent"
        | "not_found"
        | "rate_limited"
        | string;

      if (
        status === "sent" ||
        status === "not_found" ||
        status === "rate_limited"
      ) {
        setState({ kind: "success", status });
      } else {
        setState({ kind: "success", status: "sent" });
      }
    } catch {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setState({
        kind: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  }

  function handleRetry() {
    setState({ kind: "idle" });
  }

  const isSubmitting = state.kind === "submitting";
  const canSubmit =
    orgInput.trim().length > 0 &&
    email.trim().length > 0 &&
    !isSubmitting &&
    (turnstileSiteKey ? turnstileToken !== null : true);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-request-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl border border-white/10 bg-[#111111] shadow-2xl"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/8">
          <div className="flex flex-col gap-1.5">
            <span
              id="score-request-title"
              className="font-bold text-sm text-foreground tracking-tight"
            >
              Get your score by email
            </span>
            <p className="text-[0.8rem] leading-relaxed text-muted-foreground/75">
              We rank GitHub organizations (not personal accounts) with at least one repo of{" "}
              <span className="text-foreground font-medium">100+ stars</span>,{" "}
              <span className="text-foreground font-medium">created after 2015</span>, and active this quarter on GitHub or npm · PyPI · Cargo.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-white/6 transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {state.kind === "success" ? (
            <SuccessView status={state.status} email={email} onClose={onClose} />
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Org input */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="org-input"
                  className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/60"
                >
                  GitHub organization URL or login
                </label>
                <input
                  ref={orgInputRef}
                  id="org-input"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  required
                  maxLength={200}
                  placeholder="github.com/supabase"
                  value={orgInput}
                  onChange={(e) => setOrgInput(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-white/10 bg-white/3 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-brand/50 focus:bg-white/5 transition-colors disabled:opacity-50"
                />
                <div className="min-h-[1.1rem] font-mono text-[0.65rem] text-muted-foreground/50">
                  {orgInput.trim().length > 0 &&
                    (normalizedPreview ? (
                      <>
                        We&apos;ll look up:{" "}
                        <code className="text-muted-foreground/80">
                          {normalizedPreview}
                        </code>
                      </>
                    ) : (
                      <span className="text-[#ff6b6b]/80">
                        Doesn&apos;t look like a valid GitHub login.
                      </span>
                    ))}
                </div>
              </div>

              {/* Email input */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email-input"
                  className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/60"
                >
                  Email
                </label>
                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-white/10 bg-white/3 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-brand/50 focus:bg-white/5 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Honeypot — off-screen, hidden from assistive tech */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  width: "1px",
                  height: "1px",
                  overflow: "hidden",
                }}
              >
                <label htmlFor="company_website">Website (leave blank)</label>
                <input
                  id="company_website"
                  name="company_website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              {/* Turnstile (invisible) */}
              {turnstileSiteKey ? (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                  options={{
                    size: "invisible",
                    theme: "dark",
                    appearance: "interaction-only",
                  }}
                />
              ) : null}

              {/* Legal / consent copy */}
              <p className="text-[0.7rem] leading-relaxed text-muted-foreground/50">
                By submitting, you consent to receive this one-time email.
                We&apos;ll store your email and request to improve our index.
              </p>

              {/* Error */}
              {state.kind === "error" && (
                <div className="flex items-start gap-2 rounded-lg border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 px-3 py-2.5 text-[0.8rem] text-[#ff9999]">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{state.message}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-brand/30 bg-brand/12 text-brand hover:border-brand/50 hover:bg-brand/20 transition-all font-mono text-[0.7rem] uppercase tracking-widest cursor-pointer group",
                  !canSubmit && "opacity-50 cursor-not-allowed hover:border-brand/30 hover:bg-brand/12",
                )}
              >
                {isSubmitting ? (
                  <span className="flex gap-1.5" aria-label="Submitting…">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-brand/70 animate-pulse"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                ) : state.kind === "error" ? (
                  <>
                    <Mail size={13} className="group-hover:scale-110 transition-transform" />
                    Retry
                  </>
                ) : (
                  <>
                    <Mail size={13} className="group-hover:scale-110 transition-transform" />
                    Email me my score
                  </>
                )}
              </button>

              {state.kind === "error" && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-[0.7rem] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors font-mono uppercase tracking-widest"
                >
                  Dismiss error
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Success view ─────────────────────────────────────────────────────────────

function SuccessView({
  status,
  email,
  onClose,
}: {
  status: "sent" | "not_found" | "rate_limited";
  email: string;
  onClose: () => void;
}) {
  const copy = successCopy(status, email);

  return (
    <div className="flex flex-col gap-4 items-start py-2">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          status === "rate_limited"
            ? "bg-[#f4c430]/10 text-[#f4c430]"
            : "bg-brand/12 text-brand",
        )}
      >
        <CheckCircle2 size={18} />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="font-semibold text-sm text-foreground">{copy.title}</p>
        <p className="text-[0.85rem] leading-relaxed text-muted-foreground/75">
          {copy.body}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/3 text-muted-foreground/70 hover:border-white/20 hover:text-foreground transition-all font-mono text-[0.7rem] uppercase tracking-widest cursor-pointer"
      >
        Close
      </button>
    </div>
  );
}

function successCopy(
  status: "sent" | "not_found" | "rate_limited",
  email: string,
): { title: string; body: string } {
  if (status === "rate_limited") {
    return {
      title: "We’ve already sent this report.",
      body: `We recently sent a report for this org to ${email}. Check your inbox (and spam folder) — a new one will be available next quarter.`,
    };
  }
  if (status === "not_found") {
    return {
      title: "Check your inbox.",
      body: `We couldn’t find that org in the current dataset, but we sent a note to ${email} explaining what we include and when to try again.`,
    };
  }
  return {
    title: "Check your inbox.",
    body: `Your report is on the way to ${email}. It should arrive within a minute or two.`,
  };
}
