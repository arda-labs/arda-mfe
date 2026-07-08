import { Loader2 } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import type { WorkItem } from "./api"

export function WorkItemCard({
  item,
  claiming,
  onOpen,
}: {
  item: WorkItem
  claiming: boolean
  onOpen: (item: WorkItem) => void
}) {
  const canAct = onOpen != null && !claiming

  return (
    <div
      className={cn(
        "relative flex min-w-0 items-start gap-3 rounded-md px-2 py-2 -mx-2",
        canAct && "cursor-pointer hover:bg-accent/50 transition-colors",
        claiming && "pointer-events-none opacity-60"
      )}
      onClick={() => {
        if (canAct) onOpen(item)
      }}
      role={canAct ? "button" : undefined}
      tabIndex={canAct ? 0 : undefined}
      onKeyDown={(e) => {
        if (canAct && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onOpen(item)
        }
      }}
    >
      {claiming ? (
        <span className="absolute left-0 top-0 z-10 flex size-full items-center justify-center rounded-md bg-background/50">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm font-medium text-foreground group-hover:text-accent-foreground">
          {item.title}
        </p>
        {item.description || item.summary ? (
          <p className="line-clamp-2 whitespace-normal break-words text-xs leading-5 text-muted-foreground">
            {item.description || item.summary}
          </p>
        ) : null}
        <CodeBadge code={item.caseCode} />
      </div>
    </div>
  )
}

function CodeBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-md border border-border bg-background px-1.5 font-mono text-[10px] leading-none text-muted-foreground">
      {code}
    </span>
  )
}
