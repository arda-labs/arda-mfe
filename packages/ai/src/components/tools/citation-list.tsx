import { useI18n } from "@workspace/i18n"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { ChevronDown } from "lucide-react"
import { textValue, type ToolResultPayload } from "../../lib/messages"
import type { ToolResultViewProps } from "../../lib/registry"
import { registerToolRenderer } from "../../lib/registry"

type CitationItem = Record<string, unknown>

function isCitationResult(result: ToolResultPayload): boolean {
  return Array.isArray(result.citations)
}

function citationItems(result: ToolResultPayload): CitationItem[] {
  return (result.citations as unknown[]).filter(
    (item): item is CitationItem => typeof item === "object" && item !== null
  )
}

export function KnowledgeCitationList({ result }: ToolResultViewProps) {
  const { t } = useI18n()
  if (!isCitationResult(result)) return null
  const citations = citationItems(result)

  return (
    <div className="mt-3 space-y-2 border-t pt-3 text-xs">
      {citations.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-medium">{t("ai.tool.citations.title")}</p>
          <ul className="space-y-1.5 text-muted-foreground">
            {citations.map((citation, index) => (
              <li key={`${textValue(citation.sourceId, "source")}-${index}`}>
                <span className="font-medium text-foreground">
                  {textValue(citation.title, t("ai.tool.citations.fallback"))}
                </span>
                <span>
                  {" · "}
                  {textValue(
                    citation.heading,
                    textValue(citation.sourceKey, t("ai.tool.citations.fallback"))
                  )}
                  {textValue(citation.version) && ` · v${textValue(citation.version)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Collapsible>
        <CollapsibleTrigger className="group flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground">
          <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
          {t("ai.tool.citations.details")}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-2 leading-5 text-muted-foreground">
            {JSON.stringify(result, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export function registerKnowledgeCitationRenderer() {
  registerToolRenderer({
    id: "arda.knowledge-citations",
    match: isCitationResult,
    component: KnowledgeCitationList,
  })
}
