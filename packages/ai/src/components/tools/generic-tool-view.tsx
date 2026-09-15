import { useI18n } from "@workspace/i18n"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { ChevronDown, Wrench } from "lucide-react"
import { extractApprovalProposal, type ToolResultPayload } from "../../lib/messages"
import { resolveToolRenderer } from "../../lib/registry"
import { ApprovalCard } from "./approval-card"
import { SearchMetaToolUI, ExecuteMetaToolUI } from "./meta-tool-ui"
import { DataTableView, isArrayResult } from "./data-table-view"

export { SearchMetaToolUI, ExecuteMetaToolUI }

export function GenericToolView({
  toolName,
  result,
}: {
  toolName: string
  result?: ToolResultPayload
}) {
  const { t } = useI18n()
  if (!result) return null

  // Check custom registry first (dynamic domain MFE renderers)
  const entry = resolveToolRenderer(result)
  if (entry) {
    const CustomComponent = entry.component
    return <CustomComponent result={result} />
  }

  // Check if it's an approval proposal
  const proposal = extractApprovalProposal(result)
  if (proposal) {
    return <ApprovalCard proposal={proposal} />
  }

  // If result is an array of objects, render DataTableView
  if (isArrayResult(result)) {
    return <DataTableView data={result as Array<Record<string, unknown>>} />
  }

  return (
    <Collapsible className="w-full">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
        <Wrench className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate text-foreground">
          {t("ai.tool.executed", { name: toolName }) || `Tool: ${toolName}`}
        </span>
        <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-open:animate-collapsible-down data-closed:animate-collapsible-up">
        <pre className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-[11px] leading-5 text-muted-foreground">
          {JSON.stringify(result, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}
