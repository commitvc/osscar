"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  name: string;
  rank: number;
  tierLabel: string;
  slug: string;
}

export function ShareButton({ name, rank, tierLabel, slug }: ShareButtonProps) {
  const [state, setState] = useState<"idle" | "copied">("idle");

  async function handleShare() {
    const url = `${window.location.origin}/org/${slug}`;
    const text = `${name} ranked #${rank} in the ${tierLabel} tier — OSS Growth Index Q4 2025`;

    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {
        // user cancelled or share failed, fall through to clipboard
        await copyToClipboard(url);
      }
    } else {
      await copyToClipboard(url);
    }
  }

  async function copyToClipboard(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={handleShare}
      className={cn(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all font-mono text-[0.65rem] uppercase tracking-widest cursor-pointer group",
        state === "copied"
          ? "border-green/40 bg-green/10 text-green"
          : "border-brand/25 bg-brand/8 text-brand hover:border-brand/50 hover:bg-brand/15"
      )}
    >
      {state === "copied" ? (
        <>
          <Check size={13} />
          Copied!
        </>
      ) : (
        <>
          <Share2
            size={13}
            className="group-hover:scale-110 transition-transform"
          />
          Share
        </>
      )}
    </button>
  );
}
