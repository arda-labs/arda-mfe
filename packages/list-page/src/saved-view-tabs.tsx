import { useQueries } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { cn } from "@workspace/ui/lib/utils"
import { applyServerListFilters, type ServerListQueryConfig } from "./server-list"

export type SavedView = {
  id: string
  label: string
  /** Value written to the URL filter; omit for the "all" view. */
  value?: string
}

export type SavedViewTabsProps = {
  views: SavedView[]
  /** URL filter key the views drive (must be a filter of `config`). */
  urlKey: string
  /** The list definition's queryConfig, so switching resets the page. */
  config: ServerListQueryConfig
  /** Per-view count: the list total for that filter (per_page = 1). */
  countFn?: (value: string | undefined) => Promise<number>
  /** Shares the list query key prefix so list invalidations refresh counts. */
  countKey?: readonly unknown[]
  className?: string
  "aria-label"?: string
}

const formatCount = (count: number) => (count > 999 ? "999+" : String(count))

/**
 * Tabs over one list filter (design board 12.2, "Chờ duyệt 3 · Nháp 2"):
 * the work queue a user cares about is one click away, with its size.
 * The active view lives in the URL like every other list filter.
 */
export function SavedViewTabs({
  views,
  urlKey,
  config,
  countFn,
  countKey = [],
  className,
  ...aria
}: SavedViewTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const current = searchParams.get(urlKey) ?? undefined
  const active = views.find((view) => view.value === current) ?? (current ? undefined : views.find((view) => !view.value))

  const counts = useQueries({
    queries: views.map((view) => ({
      queryKey: [...countKey, "view-count", urlKey, view.value ?? ""],
      queryFn: () => countFn!(view.value),
      enabled: Boolean(countFn),
      staleTime: 30_000,
    })),
  })

  const select = (view: SavedView) => {
    setSearchParams(applyServerListFilters(searchParams, { [urlKey]: view.value ?? "" }, config))
  }

  return (
    <div
      role="tablist"
      data-slot="saved-view-tabs"
      className={cn("-mb-px flex min-w-0 items-end gap-1 overflow-x-auto border-b", className)}
      {...aria}
    >
      {views.map((view, index) => {
        const selected = view === active
        const count = counts[index]?.data
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => select(view)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              selected
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {view.label}
            {typeof count === "number" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] leading-4 tabular-nums",
                  selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {formatCount(count)}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
