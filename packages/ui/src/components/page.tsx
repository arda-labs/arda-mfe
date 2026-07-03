import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

export function Page({
  variant = "scroll",
  className,
  children,
}: {
  variant?: "scroll" | "fixed"
  className?: string
  children: ReactNode
}) {
  if (variant === "fixed") {
    return (
      <section
        className={cn(
          "flex h-full min-h-[calc(100dvh-7.5rem)] flex-col gap-3",
          className,
        )}
      >
        {children}
      </section>
    )
  }
  return (
    <div className={cn("flex flex-col gap-4", className)}>{children}</div>
  )
}
