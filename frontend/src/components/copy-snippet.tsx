"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopySnippetProps {
  code: string;
  label: string;
}

export function CopySnippet({ code, label }: CopySnippetProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-1.5">
      <span className="font-mono text-[0.55rem] uppercase tracking-widest text-muted-foreground/35">
        {label}
      </span>
      <div className="relative group">
        <pre className="font-mono text-[0.6rem] text-muted-foreground/60 bg-white/3 border border-white/8 rounded-lg p-3 pr-9 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
          {code}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-muted-foreground/50 hover:text-muted-foreground/80 cursor-pointer"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <Check size={10} className="text-green" />
          ) : (
            <Copy size={10} />
          )}
        </button>
      </div>
    </div>
  );
}
