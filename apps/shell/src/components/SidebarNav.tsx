import { useEffect, useRef, type Dispatch, type MouseEvent, type SetStateAction } from "react"
import { ChevronRight } from "lucide-react"
import type { MessageKey } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import { preloadNavigation } from "../navigation-preload"
import type { NavNode } from "../config/nav-config"
import { containsHref, getNavLabel, getNavNodeId } from "../config/nav-config"

export function SidebarNode({
  item,
  depth,
  activeHref,
  navigate,
  sidebarOpen,
  openGroups,
  setOpenGroups,
  siblingGroupIds = [],
  t,
}: {
  item: NavNode
  depth: number
  /** The one href that owns the current path (see findActiveHref). */
  activeHref: string | undefined
  navigate: (pathname: string) => void
  sidebarOpen: boolean
  openGroups: Record<string, boolean>
  setOpenGroups: Dispatch<SetStateAction<Record<string, boolean>>>
  /** Ids of the other top-level groups; opening one collapses these (accordion). */
  siblingGroupIds?: string[]
  t: (key: MessageKey) => string
}) {
  const activeRef = useRef<HTMLAnchorElement>(null)
  const label = getNavLabel(item, t)
  const hasChildren = Boolean(item.children?.length)
  const isActive = !hasChildren && Boolean(item.href) && item.href === activeHref
  const hasActiveChild =
    hasChildren &&
    Boolean(item.children?.some((child) => containsHref(child, activeHref)))
  const nodeId = getNavNodeId(item)
  const isExpanded = openGroups[nodeId] ?? hasActiveChild
  const open = sidebarOpen && isExpanded

  const isChild = depth > 0

  // Keep the current page visible in a long menu after navigation.
  useEffect(() => {
    if (isActive) {
      activeRef.current?.scrollIntoView({ block: "nearest" })
    }
  }, [isActive])

  const itemClassName = cn(
    "flex w-full items-center gap-2.5 rounded-lg transition-colors select-none",
    isChild ? "h-8 px-2.5 text-[13px]" : "h-9 px-3 text-sm",
    isActive
      ? "bg-card font-semibold text-foreground shadow-card ring-1 ring-border/60 [&>svg]:text-primary"
      : hasActiveChild
        ? "font-medium text-foreground hover:bg-sidebar-accent"
        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
  )

  if (hasChildren) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() =>
            setOpenGroups((current) => {
              const currentVal = current[nodeId] ?? hasActiveChild
              const next = { ...current, [nodeId]: !currentVal }
              if (!currentVal && depth === 0) {
                for (const id of siblingGroupIds) {
                  if (id !== nodeId) next[id] = false
                }
              }
              return next
            })
          }
          className={itemClassName}
          title={!sidebarOpen ? label : undefined}
          aria-expanded={open}
        >
          <item.icon
            className={cn(
              "shrink-0",
              isChild ? "size-3.5" : "size-4",
              hasActiveChild && "text-primary"
            )}
          />
          {sidebarOpen && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              <ChevronRight
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200",
                  open && "rotate-90 text-foreground"
                )}
              />
            </>
          )}
        </button>
        {open && (
          <div className="relative ml-[19px] mt-0.5 space-y-0.5 border-l border-border pl-2">
            {item.children?.map((child) => (
              <SidebarNode
                key={getNavNodeId(child)}
                item={child}
                depth={depth + 1}
                activeHref={activeHref}
                navigate={navigate}
                sidebarOpen={sidebarOpen}
                openGroups={openGroups}
                setOpenGroups={setOpenGroups}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!item.href) return null
  const href = item.href

  // A real link, so users can open a menu item in a new tab or copy its URL;
  // a plain left click still navigates in-app.
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    void preloadNavigation(href)
    navigate(href)
  }

  return (
    <a
      ref={activeRef}
      href={href}
      data-preload-href={href}
      onClick={onClick}
      className={itemClassName}
      title={!sidebarOpen ? label : undefined}
      aria-current={isActive ? "page" : undefined}
    >
      <item.icon className={cn("shrink-0", isChild ? "size-3.5" : "size-4")} />
      {sidebarOpen && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}
    </a>
  )
}
