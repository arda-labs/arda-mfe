import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

const sizeClass = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
}

type BrandMarkProps = {
  name: string
  logoUrl?: string
  size?: keyof typeof sizeClass
  className?: string
}

function BrandMark({ name, logoUrl, size = "md", className }: BrandMarkProps) {
  const [failed, setFailed] = React.useState(false)
  const showLogo = Boolean(logoUrl && !failed)

  React.useEffect(() => {
    setFailed(false)
  }, [logoUrl])

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-primary/10 bg-primary font-semibold text-primary-foreground shadow-card",
        sizeClass[size],
        className
      )}
    >
      {showLogo ? (
        <img
          src={logoUrl}
          alt={name}
          className="size-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{getBrandInitials(name)}</span>
      )}
    </div>
  )
}

function getBrandInitials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return "A"
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export { BrandMark }
