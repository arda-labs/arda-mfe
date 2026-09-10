import { useI18n } from "@workspace/i18n"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { ChevronDown, ExternalLink } from "lucide-react"
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
  const { t, formatDate } = useI18n()
  if (!isCitationResult(result)) return null
  const citations = citationItems(result)

  const formatEffective = (citation: CitationItem): string => {
    const from = textValue(citation.effective_from)
    const to = textValue(citation.effective_to)
    if (!from && !to) return ""
    const format = (value: string) =>
      formatDate(value, { day: "2-digit", month: "2-digit", year: "numeric" })
    return t("ai.tool.citations.effective", {
      from: from ? format(from) : "—",
      to: to ? format(to) : "—",
    })
  }

  return (
    <div className="mt-3 space-y-2 border-t pt-3 text-xs">
      {citations.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-medium">{t("ai.tool.citations.title")}</p>
          <ul className="space-y-1.5">
            {citations.map((citation, index) => {
              const url = textValue(citation.url)
              const title = textValue(citation.title, t("ai.tool.citations.fallback"))
              const heading = textValue(citation.heading)
              const version = textValue(citation.version)
              const effective = formatEffective(citation)
              const key = `${textValue(citation.sourceKey, textValue(citation.source_id, "source"))}-${index}`
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5"
                >
                  <span className="font-medium text-foreground">{title}</span>
                  {heading && <span className="text-muted-foreground">· {heading}</span>}
                  {version && <span className="text-muted-foreground">· v{version}</span>}
                  {effective && <span className="text-muted-foreground">· {effective}</span>}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {t("ai.tool.citations.open")}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {citations.length === 0 && (
        <p className="text-muted-foreground">{t("ai.tool.citations.no_evidence")}</p>
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
