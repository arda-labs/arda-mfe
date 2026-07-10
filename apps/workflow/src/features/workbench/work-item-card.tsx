import { Loader2 } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import type { WorkItem } from "./api"
import { workItemInteraction } from "./work-item-state"
import "./work-item-card.css"

export function WorkItemCard({
  item,
  claiming,
  onOpen,
}: {
  item: WorkItem
  claiming: boolean
  onOpen: (item: WorkItem) => void
}) {
  const { canAct, isRouting } = workItemInteraction(item, claiming)

  return (
    <div
      className={cn(
        "relative -mx-2 flex min-w-0 items-start gap-3 rounded-md px-2 py-2",
        canAct && "cursor-pointer transition-colors hover:bg-accent/50",
        isRouting && "cursor-default opacity-75",
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
        <span className="absolute top-0 left-0 z-20 flex size-full items-center justify-center rounded-md bg-background/50">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </span>
      ) : null}
      <div className="relative z-10 min-w-0 flex-1 space-y-1.5 overflow-hidden">
        <CodeBadge code={item.caseCode} />
        <p className="line-clamp-2 text-sm font-medium text-pretty text-foreground group-hover:text-accent-foreground">
          {item.title}
        </p>
        {item.description || item.summary ? (
          <p className="line-clamp-3 w-full min-w-0 text-xs leading-5 text-pretty break-words whitespace-normal text-muted-foreground">
            {item.description || item.summary}
          </p>
        ) : null}
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
