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
  const itemClassName = cn(
    "relative flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:transition-colors",
    isActive || hasActiveChild
      ? "bg-primary/10 font-medium text-primary before:bg-primary"
      : "text-muted-foreground before:bg-transparent hover:bg-muted/80 hover:text-foreground"
  )
  const style = sidebarOpen
    ? { paddingLeft: `${0.75 + depth * 0.9}rem` }
    : undefined

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            setOpenGroups((current) => {
              const currentVal = current[nodeId] ?? hasActiveChild
              return { ...current, [nodeId]: !currentVal }
            })
          }
          className={itemClassName}
          style={style}
          title={!sidebarOpen ? label : undefined}
          aria-expanded={open}
        >
          <item.icon className="size-4 shrink-0" />
          {sidebarOpen && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform",
                  open && "rotate-90"
                )}
              />
            </>
          )}
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5">
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
      style={style}
      title={!sidebarOpen ? label : undefined}
      aria-current={isActive ? "page" : undefined}
    >
      <item.icon className="size-4 shrink-0" />
      {sidebarOpen && <span className="truncate">{label}</span>}
    </button>
  )
}
