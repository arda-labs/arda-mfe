import type { Dispatch, SetStateAction } from "react"
import { ChevronRight } from "lucide-react"
import type { MessageKey } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import { preloadRemoteForPath } from "../remote-routes"
import type { NavNode } from "../config/nav-config"
import { getNavLabel, getNavNodeId, isNodeActive } from "../config/nav-config"

export function SidebarNode({
  item,
  depth,
  locationPath,
  navigate,
  sidebarOpen,
  openGroups,
  setOpenGroups,
  t,
}: {
  item: NavNode
  depth: number
  locationPath: string
  navigate: (pathname: string) => void
  sidebarOpen: boolean
  openGroups: Record<string, boolean>
  setOpenGroups: Dispatch<SetStateAction<Record<string, boolean>>>
  t: (key: MessageKey) => string
}) {
  const label = getNavLabel(item, t)
  const hasChildren = Boolean(item.children?.length)
  const isActive =
    item.href === "/"
      ? locationPath === "/"
      : item.href
        ? locationPath.startsWith(item.href)
        : false
  const hasActiveChild =
    hasChildren &&
    item.children?.some((child) => isNodeActive(child, locationPath))
  const nodeId = getNavNodeId(item)
  const isExpanded = openGroups[nodeId] ?? hasActiveChild
  const open = sidebarOpen && isExpanded

  const isChild = depth > 0

  const itemClassName = cn(
    "flex w-full items-center gap-2.5 rounded-md transition-colors select-none",
    isChild ? "h-8 px-2.5 text-[13px]" : "h-9 px-3 text-sm",
    isActive
      ? "bg-primary/10 font-medium text-primary"
      : hasActiveChild
        ? "font-medium text-foreground hover:bg-muted/80"
        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
  )

  if (hasChildren) {
    return (
      <div className="w-full">
        <button
          type="button"
          onClick={() =>
            setOpenGroups((current) => {
              const currentVal = current[nodeId] ?? hasActiveChild
              return { ...current, [nodeId]: !currentVal }
            })
          }
          className={itemClassName}
          title={!sidebarOpen ? label : undefined}
          aria-expanded={open}
        >
          <item.icon className={cn("shrink-0", isChild ? "size-3.5" : "size-4")} />
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
          <div className="relative ml-[19px] mt-0.5 space-y-0.5 border-l border-border/70 pl-2">
            {item.children?.map((child) => (
              <SidebarNode
                key={getNavNodeId(child)}
                item={child}
                depth={depth + 1}
                locationPath={locationPath}
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

  return (
    <button
      type="button"
      onFocus={() => void preloadRemoteForPath(item.href!)}
      onClick={() => navigate(item.href!)}
      onPointerDown={() => void preloadRemoteForPath(item.href!)}
      onPointerEnter={() => void preloadRemoteForPath(item.href!)}
      className={itemClassName}
      title={!sidebarOpen ? label : undefined}
      aria-current={isActive ? "page" : undefined}
    >
      <item.icon className={cn("shrink-0", isChild ? "size-3.5" : "size-4")} />
      {sidebarOpen && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}
    </button>
  )
}
