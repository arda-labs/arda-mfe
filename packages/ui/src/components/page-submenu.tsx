import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

export function PageSubmenu({
  title,
  icon: Icon,
  collapsed,
  onCollapsedChange,
  meta,
  embedded = false,
  children,
}: {
  title: string
  icon?: LucideIcon
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  /** Header line of the desktop aside + Sheet description (e.g. "12 việc"). */
  meta?: ReactNode
  /** When true, the aside drops its own card chrome and uses a right divider instead — use inside a shared card. */
  embedded?: boolean
  children: ReactNode
}) {
  const openLabel = `Open ${title.toLowerCase()} menu`
  const closeLabel = `Collapse ${title.toLowerCase()} menu`

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <aside
          className={cn(
            "hidden min-h-0 shrink-0 flex-col md:flex",
            embedded
              ? "border-r"
              : "rounded-md border bg-background",
            collapsed ? "w-14" : "w-[220px]",
          )}
          aria-label={title}
        >
          <div
            className={cn(
              "flex h-10 items-center gap-2 border-b",
              collapsed ? "justify-center px-2" : "justify-between px-2.5",
            )}
          >
            {collapsed ? (
              Icon ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{title}</TooltipContent>
                </Tooltip>
              ) : null
            ) : (
              <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                {Icon ? <Icon className="size-4 shrink-0" /> : null}
                <span className="truncate">{meta}</span>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={collapsed ? openLabel : closeLabel}
                  onClick={() => onCollapsedChange(!collapsed)}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "bottom"}>
                {collapsed ? openLabel : closeLabel}
              </TooltipContent>
            </Tooltip>
          </div>
          {collapsed ? (
            <div className="flex flex-1 items-start justify-center pt-2">
              <span className="h-8 w-1 rounded-full bg-primary/60" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto p-2 pr-1">
              {children}
            </div>
          )}
        </aside>
      </TooltipProvider>

      <SheetSubmenu title={title} meta={meta}>
        {children}
      </SheetSubmenu>
    </>
  )
}

function SheetSubmenu({
  title,
  meta,
  children,
}: {
  title: string
  meta?: ReactNode
  children: ReactNode
}) {
  // Local open state keeps the mobile sheet self-contained; pages don't need to wire it.
  const [open, setOpen] = useState(false)
  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="outline"
        className="h-9 w-full justify-between"
        aria-label={`Open ${title.toLowerCase()} menu`}
        onClick={() => setOpen(true)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{title}</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-80 flex-col p-0">
          <SheetHeader className="border-b p-4 pr-10 text-left">
            <SheetTitle>{title}</SheetTitle>
            {meta ? <SheetDescription>{meta}</SheetDescription> : null}
          </SheetHeader>
          <div
            className="min-h-0 flex-1 overflow-auto p-2"
            onClick={() => setOpen(false)}
          >
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

