"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmbedModalProps {
  name: string;
  slug: string;
  onClose: () => void;
}

type Tab = "html" | "markdown";
type Variant = "default" | "light" | "compact" | "compact-light";

const VARIANTS: { key: Variant; label: string; size: string }[] = [
  { key: "default", label: "Default", size: "360 × 100" },
  { key: "light", label: "Light", size: "360 × 100" },
  { key: "compact", label: "Compact", size: "260 × 64" },
  { key: "compact-light", label: "Compact Light", size: "260 × 64" },
];

export function EmbedModal({ name, slug, onClose }: EmbedModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("html");
  const [variant, setVariant] = useState<Variant>("default");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [loadedVariants, setLoadedVariants] = useState<Set<Variant>>(new Set());
  const overlayRef = useRef<HTMLDivElement>(null);
  // Stable cache-buster so the preview images don't reload on every keystroke
  const nonce = useRef(Date.now()).current;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const badgeUrl = useMemo(
    () =>
      variant === "default"
        ? `${origin}/api/badge?slug=${slug}`
        : `${origin}/api/badge?slug=${slug}&variant=${variant}`,
    [origin, slug, variant]
  );

  const pageUrl = `${origin}/org/${slug}`;

  const snippets: Record<Tab, string> = {
    html: `<a href="${pageUrl}" target="_blank" rel="noopener noreferrer">\n  <img src="${badgeUrl}" alt="Featured on OSSCAR" />\n</a>`,
    markdown: `[![Featured on OSSCAR](${badgeUrl})](${pageUrl})`,
  };

  const currentSnippet = snippets[activeTab];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(currentSnippet);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // ignore
    }
  }

  // Reset copy state when tab or variant changes
  useEffect(() => {
    setCopyState("idle");
  }, [activeTab, variant]);

  // Close on Escape + lock body scroll
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const activeVariant = VARIANTS.find((v) => v.key === variant)!;
  const isCompact = variant === "compact" || variant === "compact-light";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[620px] rounded-2xl border border-white/10 bg-[#111111]"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-baseline gap-2.5">
            <span className="font-bold text-sm text-foreground tracking-tight">
              Embed Badge
            </span>
            <span className="font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground/40">
              {name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-white/6 transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Badge preview */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-baseline justify-between mb-3">
            <p className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground/35">
              Preview · {activeVariant.label}
            </p>
            <p className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground/25">
              {activeVariant.size}
            </p>
          </div>
          <div
            className="flex items-center justify-center rounded-xl border border-white/8 bg-white/2 py-6"
            style={{ minHeight: "112px" }}
          >
            {!loadedVariants.has(variant) && (
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-pulse bg-brand/40"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${badgeUrl}${badgeUrl.includes("?") ? "&" : "?"}_t=${nonce}`}
              alt={`OSSCAR badge — ${activeVariant.label}`}
              width={isCompact ? 260 : 360}
              height={isCompact ? 64 : 100}
              className={cn(
                "rounded-lg transition-opacity duration-300",
                loadedVariants.has(variant) ? "opacity-100" : "opacity-0 absolute"
              )}
              onLoad={() =>
                setLoadedVariants((prev) => {
                  if (prev.has(variant)) return prev;
                  const next = new Set(prev);
                  next.add(variant);
                  return next;
                })
              }
            />
          </div>

          {/* Variant picker */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {VARIANTS.map((v) => (
              <button
                key={v.key}
                onClick={() => setVariant(v.key)}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer text-left",
                  variant === v.key
                    ? "border-white/25 bg-white/8"
                    : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[0.65rem] uppercase tracking-widest",
                    variant === v.key
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                  )}
                >
                  {v.label}
                </span>
                <span className="font-mono text-[0.55rem] tracking-wider text-muted-foreground/30">
                  {v.size}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Snippet tabs */}
        <div className="px-6 pb-6 space-y-3">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-lg bg-white/4 border border-white/6 w-fit">
            {(["html", "markdown"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3 py-1 rounded-md font-mono text-[0.6rem] uppercase tracking-widest transition-all cursor-pointer",
                  activeTab === tab
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground/40 hover:text-muted-foreground/60"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Code block with copy */}
          <div className="relative group">
            <pre className="font-mono text-[0.65rem] leading-relaxed text-muted-foreground/65 bg-white/3 border border-white/8 rounded-xl p-4 pr-12 overflow-x-auto whitespace-pre-wrap break-all">
              {currentSnippet}
            </pre>
            <button
              onClick={handleCopy}
              className={cn(
                "absolute top-3 right-3 p-1.5 rounded-lg border transition-all cursor-pointer",
                copyState === "copied"
                  ? "border-green/40 bg-green/10 text-green"
                  : "border-white/10 bg-white/5 text-muted-foreground/50 hover:bg-white/10 hover:border-white/20 hover:text-muted-foreground/80"
              )}
              aria-label="Copy to clipboard"
            >
              {copyState === "copied" ? (
                <Check size={11} />
              ) : (
                <Copy size={11} />
              )}
            </button>
          </div>

          {/* Usage hint */}
          <p className="font-mono text-[0.55rem] text-muted-foreground/25 leading-relaxed">
            Paste this into your README, website, or docs to show your OSSCAR ranking.
          </p>
        </div>
      </div>
    </div>
  );
}
