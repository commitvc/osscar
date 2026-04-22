"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { ScoreRequestModal } from "@/components/score-request-modal";

/**
 * Full-width CTA card rendered directly below the leaderboard table.
 *
 * Invites visitors whose org isn't in the top 200 to request a one-page
 * report by email. Clicking the button opens <ScoreRequestModal/>.
 */
export function ScoreRequestCta() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-card/70 px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex flex-col gap-2 max-w-2xl">
            <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
              Don&apos;t see your organization?
            </h2>
            <p className="text-[0.9rem] leading-relaxed text-muted-foreground">
              We rank tens of thousands of organizations every quarter. Enter
              yours and we&apos;ll email a one-page report with your rank and
              key growth metrics.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-brand/30 bg-brand/12 px-5 py-3 font-mono text-[0.7rem] uppercase tracking-widest text-brand transition-all hover:border-brand/50 hover:bg-brand/20 cursor-pointer sm:self-auto"
          >
            <Mail
              size={13}
              className="transition-transform group-hover:scale-110"
            />
            Get your score by email
          </button>
        </div>
      </div>

      {open && <ScoreRequestModal onClose={() => setOpen(false)} />}
    </>
  );
}
