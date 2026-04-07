"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Platform icons (inline SVG paths) ────────────────────────────────────────

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function RedditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShareModalProps {
  name: string;
  rank: number;
  tierLabel: string;
  slug: string;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShareModal({
  name,
  rank,
  tierLabel,
  slug,
  onClose,
}: ShareModalProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [imageLoaded, setImageLoaded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const ogImageUrl = `/api/og?slug=${encodeURIComponent(slug)}`;
  const pageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/org/${slug}`
      : `/org/${slug}`;

  const shareText = `${name} ranked #${rank} in the ${tierLabel} tier — OSS Growth Index Q1 2026`;
  const shareTextEncoded = encodeURIComponent(shareText);
  const pageUrlEncoded = encodeURIComponent(pageUrl);

  const platforms = [
    {
      label: "X",
      icon: <XIcon size={14} />,
      href: `https://x.com/intent/tweet?text=${shareTextEncoded}&url=${pageUrlEncoded}`,
      hoverColor: "hover:border-white/20 hover:text-white",
    },
    {
      label: "LinkedIn",
      icon: <LinkedInIcon size={14} />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrlEncoded}`,
      hoverColor: "hover:border-[#0A66C2]/40 hover:text-[#0A66C2]",
    },
    {
      label: "Reddit",
      icon: <RedditIcon size={14} />,
      href: `https://www.reddit.com/submit?url=${pageUrlEncoded}&title=${shareTextEncoded}`,
      hoverColor: "hover:border-[#FF4500]/40 hover:text-[#FF4500]",
    },
  ];

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    // Prevent background scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function handleDownload() {
    const a = document.createElement("a");
    a.href = ogImageUrl;
    a.download = `${slug}-osscar-q1-2026.png`;
    a.click();
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // ignore
    }
  }

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
        className="relative w-full max-w-[680px] rounded-2xl border border-white/10 bg-[#111111] shadow-2xl"
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-baseline gap-2.5">
            <span className="font-bold text-sm text-foreground tracking-tight">
              Share
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

        {/* Image preview */}
        <div className="p-5">
          <div
            className="w-full rounded-xl overflow-hidden border border-white/8 relative"
            style={{ aspectRatio: "1200/630", backgroundColor: "#0a0a0a" }}
          >
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-brand/40 animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImageUrl}
              alt={`${name} share card`}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          {/* Download */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-brand/30 bg-brand/10 text-brand hover:border-brand/50 hover:bg-brand/18 transition-all font-mono text-[0.65rem] uppercase tracking-widest cursor-pointer group"
          >
            <Download
              size={13}
              className="group-hover:scale-110 transition-transform"
            />
            Download Image
          </button>

          {/* Platform share buttons */}
          <div className="grid grid-cols-3 gap-2">
            {platforms.map((p) => (
              <a
                key={p.label}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/3 text-muted-foreground/55 transition-all font-mono text-[0.65rem] uppercase tracking-widest group",
                  p.hoverColor
                )}
              >
                <span className="group-hover:scale-110 transition-transform">
                  {p.icon}
                </span>
                {p.label}
              </a>
            ))}
          </div>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all font-mono text-[0.65rem] uppercase tracking-widest cursor-pointer group",
              copyState === "copied"
                ? "border-green/35 bg-green/8 text-green"
                : "border-white/8 bg-white/3 text-muted-foreground/40 hover:border-white/15 hover:text-muted-foreground/60"
            )}
          >
            {copyState === "copied" ? (
              <>
                <Check size={13} />
                Link Copied!
              </>
            ) : (
              <>
                <Copy
                  size={13}
                  className="group-hover:scale-110 transition-transform"
                />
                Copy Page Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
