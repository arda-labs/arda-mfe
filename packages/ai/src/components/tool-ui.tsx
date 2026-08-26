import { makeAssistantToolUI } from "@assistant-ui/react"
import { useI18n } from "@workspace/i18n"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { ChevronDown, Wrench } from "lucide-react"
import { extractApprovalProposal, type ToolResultPayload } from "../messages"
import { resolveToolRenderer } from "../registry"
import { ApprovalCard } from "./approval-card"
import { CustomerSummaryCard } from "./customer-summary-card"
import { KnowledgeCitationList } from "./citation-list"

export const CustomerSummaryToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  Record<string, unknown>
>({
  toolName: "crm.customer.get",
  render: ({ result }) => {
    if (!result) return null
    return <CustomerSummaryCard result={result} />
  },
})

export const KnowledgeCitationToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  Record<string, unknown>
>({
  toolName: "knowledge.search",
  render: ({ result }) => {
    if (!result) return null
    return <KnowledgeCitationList result={result} />
  },
})

export const CustomerExportPrepareToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  Record<string, unknown>
>({
  toolName: "crm.customer.export.prepare",
  render: ({ result }) => {
    if (!result) return null
    const proposal = extractApprovalProposal(result)
    if (!proposal) return <GenericToolView result={result} toolName="crm.customer.export.prepare" />
    return <ApprovalCard proposal={proposal} />
  },
})

export function GenericToolView({
  toolName,
  result,
}: {
  toolName: string
  result?: ToolResultPayload
}) {
  const { t } = useI18n()
  if (!result) return null

  // Check custom registry first
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

  return (
    <Collapsible className="my-2 w-full">
      <CollapsibleTrigger className="group flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors">
        <Wrench className="size-3.5" />
        <span>
          {t("ai.tool.executed", { name: toolName }) || `Tool: ${toolName}`}
        </span>
        <ChevronDown className="ml-auto size-3.5 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground font-mono">
          {JSON.stringify(result, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}
