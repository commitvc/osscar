"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { Quarter } from "@/types";

type Props = {
  quarters: Quarter[];
  selectedQuarterId: string;
};

const quarterControlClass =
  "h-7 rounded-full border border-white/10 bg-background font-mono text-[0.6rem] sm:text-[0.65rem] leading-none uppercase tracking-widest text-muted-foreground whitespace-nowrap";

export function QuarterSelector({ quarters, selectedQuarterId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuarterId = quarters.find((q) => q.is_current)?.id;

  function handleChange(nextQuarterId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQuarterId === currentQuarterId) {
      params.delete("quarter");
    } else {
      params.set("quarter", nextQuarterId);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  if (quarters.length <= 1) {
    const selected = quarters.find((q) => q.id === selectedQuarterId);
    if (!selected) return null;
    return (
      <span className={`${quarterControlClass} inline-flex items-center px-2.5`}>
        {selected.label}
      </span>
    );
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Quarter</span>
      <select
        value={selectedQuarterId}
        onChange={(event) => handleChange(event.target.value)}
        className={`${quarterControlClass} cursor-pointer appearance-none py-0 pl-2.5 pr-7 outline-none transition-colors hover:border-white/20 hover:text-foreground focus:border-green/50`}
      >
        {quarters.map((quarter) => (
          <option
            key={quarter.id}
            value={quarter.id}
            className="font-mono text-[0.65rem] uppercase tracking-widest"
          >
            {quarter.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        className="pointer-events-none absolute right-2 text-muted-foreground/50"
        aria-hidden="true"
      />
    </label>
  );
}
