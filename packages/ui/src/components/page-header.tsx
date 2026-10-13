import * as React from "react"
import { createPortal } from "react-dom"
import type { LucideIcon } from "lucide-react"
import {
  clearShellPageTitle,
  emitShellPageTitle,
  SHELL_PAGE_HEADER_SLOT_ID,
} from "@workspace/ui/shell/page-title"

import { cn } from "@workspace/ui/lib/utils"

export type PageHeaderProps = {
  title: string
  /** Optional module icon, drawn inline before the title. */
  icon?: LucideIcon
  /** Line above the title: breadcrumb, back link or document code. */
  eyebrow?: React.ReactNode
  description?: React.ReactNode
  /** Next to the title: count, status badge, scope badge. */
  meta?: React.ReactNode
  actions?: React.ReactNode
  /**
   * Rendered into the shell header while the title is scrolled away (e.g. a
   * compact toolbar). When set, the shell does not repeat the title.
   */
  collapsedContent?: React.ReactNode
  /** Content under the title row that hides once the header scrolls away. */
  children?: React.ReactNode
  className?: string
}

/**
 * The one page header (design board 02/16): eyebrow, title + meta, actions.
 * When the header scrolls out of view the shell header shows the title, so
 * long pages keep their context without a sticky block.
 */
export function PageHeader({
  title,
  icon: Icon,
  eyebrow,
  description,
  meta,
  actions,
  collapsedContent,
  children,
  className,
}: PageHeaderProps) {
  const id = React.useId()
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = React.useState(false)
  const hideTitle = Boolean(collapsedContent)
  const slot =
    typeof document === "undefined"
      ? null
      : document.getElementById(SHELL_PAGE_HEADER_SLOT_ID)

  React.useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // A header that has no box yet (page still behind a Suspense
        // fallback, hidden tab) is not "scrolled away".
        if (!entry.boundingClientRect.height) return
        const nextCollapsed = !entry.isIntersecting
        setCollapsed(nextCollapsed)
        emitShellPageTitle({ id, title, collapsed: nextCollapsed, hideTitle })
      },
      { root: getScrollParent(node) }
    )

    emitShellPageTitle({ id, title, collapsed: false, hideTitle })
    observer.observe(node)

    return () => {
      observer.disconnect()
      clearShellPageTitle(id)
    }
  }, [hideTitle, id, title])

  return (
    <>
      <div className={cn("flex shrink-0 flex-col gap-3", className)}>
        <div
          ref={ref}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div className="min-w-0 space-y-1">
            {eyebrow ? (
              <div className="text-sm text-muted-foreground">{eyebrow}</div>
            ) : null}
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {Icon ? (
                <Icon
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground"
                />
              ) : null}
              <h1 className="truncate text-[1.375rem] leading-tight font-semibold tracking-[-0.015em]">
                {title}
              </h1>
              {meta}
            </div>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          ) : null}
        </div>
        {collapsed ? null : children}
      </div>
      {collapsed && collapsedContent && slot
        ? createPortal(collapsedContent, slot)
        : null}
    </>
  )
}

function getScrollParent(node: HTMLElement): Element | Document | null {
  let current = node.parentElement
  while (current) {
    const style = window.getComputedStyle(current)
    if (/(auto|scroll|overlay)/.test(style.overflowY)) return current
    current = current.parentElement
  }
  return null
}
