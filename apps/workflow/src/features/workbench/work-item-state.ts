import type { WorkItem } from "./api"

type WorkItemInteractionInput = Pick<
  WorkItem,
  "status" | "canClaim" | "canOpen"
>

export function workItemInteraction(
  item: WorkItemInteractionInput,
  claiming: boolean
) {
  const isRouting = item.status === "ROUTING"
  return {
    canAct: !isRouting && !claiming && Boolean(item.canClaim || item.canOpen),
    isRouting,
  }
}

export function workItemRowClassName(item: Pick<WorkItem, "status">) {
  return item.status === "ROUTING" ? "workflow-routing-row" : undefined
}
