import * as React from "react"
import { createPortal } from "react-dom"
import {
  clearShellPageTitle,
  emitShellPageTitle,
  SHELL_PAGE_HEADER_SLOT_ID,
} from "@workspace/ui/shell/page-title"

import { cn } from "@workspace/ui/lib/utils"

type PageTitleProps = {
  title: string
  description?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  collapsedContent?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageTitle({
  title,
  description,
  meta,
  actions,
  collapsedContent,
  children,
  className,
}: PageTitleProps) {
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
    if (!node) return

    const root = getScrollParent(node)
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextCollapsed = !entry.isIntersecting
        setCollapsed(nextCollapsed)
        emitShellPageTitle({
          id,
          title,
          collapsed: nextCollapsed,
          hideTitle,
        })
      },
      { root }
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
      <div className={cn("flex flex-col gap-3", className)}>
        <div
          ref={ref}
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{title}</h1>
              {meta}
            </div>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
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
