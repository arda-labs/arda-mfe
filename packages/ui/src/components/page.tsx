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
          "flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4",
          className,
        )}
      >
        {children}
      </section>
    )
  }
  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>{children}</div>
  )
}
