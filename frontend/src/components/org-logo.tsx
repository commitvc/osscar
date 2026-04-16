"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface OrgLogoProps {
  logoUrl: string | null
  name: string
  size?: number
  className?: string
}

export function OrgLogo({ logoUrl, name, size = 24, className }: OrgLogoProps) {
  const [fallback, setFallback] = useState(false)

  if (!logoUrl || fallback) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-sm bg-muted text-muted-foreground font-mono text-[10px] font-semibold uppercase shrink-0",
          className
        )}
        style={{ width: size, height: size }}
      >
        {name.charAt(0)}
      </div>
    )
  }

  return (
    <Image
      src={logoUrl}
      alt={name}
      width={size}
      height={size}
      className={cn("rounded-sm object-contain shrink-0", className)}
      onError={() => setFallback(true)}
      unoptimized
    />
  )
}
