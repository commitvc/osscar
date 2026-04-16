"use client";

import { useState } from "react";
import { CodeXml } from "lucide-react";
import { EmbedModal } from "@/components/embed-modal";

interface EmbedButtonProps {
  name: string;
  slug: string;
}

export function EmbedButton({ name, slug }: EmbedButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/12 bg-white/4 text-muted-foreground/60 hover:border-white/22 hover:bg-white/8 hover:text-muted-foreground/80 transition-all font-mono text-[0.65rem] uppercase tracking-widest cursor-pointer group"
      >
        <CodeXml
          size={13}
          className="group-hover:scale-110 transition-transform shrink-0"
        />
        Embed
      </button>

      {open && (
        <EmbedModal
          name={name}
          slug={slug}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
