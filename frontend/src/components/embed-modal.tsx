"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmbedModalProps {
  name: string;
  slug: string;
  onClose: () => void;
}

type Tab = "html" | "markdown";

export function EmbedModal({ name, slug, onClose }: EmbedModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("html");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [badgeLoaded, setBadgeLoaded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const badgeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/badge?slug=${slug}`
      : `/api/badge?slug=${slug}`;

  // Preview uses a cache-busted URL so the modal always reflects the live badge
  const badgePreviewUrl = `${badgeUrl}&_t=${Date.now()}`;

  const pageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/org/${slug}`
      : `/org/${slug}`;

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

  // Reset copy state when tab changes
  useEffect(() => {
    setCopyState("idle");
  }, [activeTab]);

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
        className="relative w-full max-w-[560px] rounded-2xl border border-white/10 bg-[#111111]"
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
          <p className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground/35 mb-3">
            Preview
          </p>
          <div
            className="flex items-center justify-center rounded-xl border border-white/8 bg-white/2 py-6"
            style={{ minHeight: "112px" }}
          >
            {!badgeLoaded && (
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badgePreviewUrl}
              alt="OSSCAR badge preview"
              width={340}
              height={100}
              className={cn(
                "rounded-lg transition-opacity duration-300",
                badgeLoaded ? "opacity-100" : "opacity-0 absolute"
              )}
              onLoad={() => setBadgeLoaded(true)}
            />
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
