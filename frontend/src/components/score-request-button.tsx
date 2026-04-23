"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { ScoreRequestModal } from "@/components/score-request-modal";

/**
 * Standalone "Get your score by email" button. Opens <ScoreRequestModal/> on click.
 * Use anywhere outside the bottom ScoreRequestCta card (e.g. the hero row).
 */
export function ScoreRequestButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-brand/30 bg-brand/12 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-brand transition-all hover:border-brand/50 hover:bg-brand/20 cursor-pointer"
      >
        <Mail
          size={11}
          className="transition-transform group-hover:scale-110"
        />
        Get your score by email
      </button>

      {open && <ScoreRequestModal onClose={() => setOpen(false)} />}
    </>
  );
}
