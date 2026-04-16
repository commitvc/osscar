"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareModal } from "@/components/share-modal";

interface ShareButtonProps {
  name: string;
  rank: number;
  tierLabel: string;
  slug: string;
}

export function ShareButton({ name, rank, tierLabel, slug }: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-brand/25 bg-brand/8 text-brand hover:border-brand/50 hover:bg-brand/15 transition-all font-mono text-[0.65rem] uppercase tracking-widest cursor-pointer group"
      >
        <Share2
          size={13}
          className="group-hover:scale-110 transition-transform"
        />
        Share
      </button>

      {open && (
        <ShareModal
          name={name}
          rank={rank}
          tierLabel={tierLabel}
          slug={slug}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
