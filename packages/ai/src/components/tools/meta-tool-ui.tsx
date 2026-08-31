import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { ChevronDown, Search, Terminal, AlertCircle, Layers } from "lucide-react"
import { makeAssistantToolUI, useToolCallElapsed } from "@assistant-ui/react"
import { DataTableView, isArrayResult } from "./data-table-view"
import { ApprovalCard } from "./approval-card"
import { extractApprovalProposal } from "../../lib/messages"

// Live wall-clock seconds for the running tool call, provided by the
// library's part timing (startedAt set by the SSE adapter).
function ToolElapsedBadge() {
  const elapsedMs = useToolCallElapsed()
  if (elapsedMs === undefined || elapsedMs < 2000) return null
  return (
    <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
      {Math.floor(elapsedMs / 1000)}s
    </span>
  )
}

export type SearchToolArgs = {
  query?: string
  domain?: string
}

export type SearchToolResult = {
  methods?: Array<{
    name: string
    sdkPath: string
    domain: string
    signature: string
    jsdoc?: string
  }>
  rawSignatures?: string
  count?: number
}

export const SearchMetaToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  Record<string, unknown>
>({
  toolName: "search",
  render: ({ args, result, status }) => {
    const query = typeof args?.query === "string" ? args.query : ""
    const isPending = status?.type === "running"

    return <SearchMetaToolCard query={query} result={result} isPending={isPending} />
  },
})

export function SearchMetaToolCard({
  query,
  result,
  isPending,
}: {
  query?: string
  result?: Record<string, unknown>
  isPending?: boolean
}) {
  const { t } = useI18n()

  if (isPending) {
    return (
      <div className="my-1.5 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground motion-safe:animate-pulse">
        <Search className="size-3.5 text-primary" />
        <span>
          {t("ai.tool.search.pending") || "Đang tìm kiếm API:"} <strong className="text-foreground">{query}</strong>
        </span>
        <ToolElapsedBadge />
      </div>
    )
  }

  if (!result) return null

  const signatures = typeof result.signatures === "string" ? result.signatures : ""
  const count = typeof result.count === "number" ? result.count : signatures.split("\n\n").filter(Boolean).length

  return (
    <Collapsible className="my-1.5 w-full motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
      <CollapsibleTrigger className="group flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors w-full">
        <Search className="size-3.5 text-primary" />
        <span className="text-foreground">
          {t("ai.tool.search.title") || "Khám phá API"}
        </span>
        {count > 0 ? (
          <Badge variant="secondary" className="ml-1 text-[10px] h-4.5 px-1.5 font-normal">
            {count} {t("ai.tool.search.methods") || "phương thức"}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-[11px]">(Không có API phù hợp)</span>
        )}
        <ChevronDown className="ml-auto size-3.5 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      {signatures && (
        <CollapsibleContent>
          <pre className="mt-1.5 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground font-mono">
            {signatures}
          </pre>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

export const ExecuteMetaToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  Record<string, unknown>
>({
  toolName: "execute",
  render: ({ args, result, status }) => {
    const isPending = status?.type === "running"
    const code = typeof args?.code === "string" ? args.code : ""

    return <ExecuteMetaToolCard code={code} result={result} isPending={isPending} />
  },
})

export function ExecuteMetaToolCard({
  code,
  result,
  isPending,
}: {
  code?: string
  result?: Record<string, unknown>
  isPending?: boolean
}) {
  const { t } = useI18n()

  if (isPending) {
    return (
      <div className="my-1.5 space-y-1.5">
        {code ? (
          <div className="rounded-lg border bg-muted/50 p-2.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Kịch bản JS
            </span>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-muted-foreground font-mono">
              {code}
              <span
                className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-primary/70 motion-safe:animate-pulse"
                aria-hidden="true"
              />
            </pre>
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground motion-safe:animate-pulse">
          <Terminal className="size-3.5 text-amber-500" />
          <span>{t("ai.tool.execute.pending") || "Đang thực thi kịch bản xử lý trong sandbox an toàn..."}</span>
          <ToolElapsedBadge />
        </div>
      </div>
    )
  }

  if (!result) return null

  // Check if execute resulted in an ApprovalProposal
  const proposal = extractApprovalProposal(result)
  if (proposal) {
    return <ApprovalCard proposal={proposal} />
  }

  const isError = Boolean(result.error)
  const durationMs = typeof result.durationMs === "number" ? result.durationMs : undefined
  const methodsCalled = Array.isArray(result.methodsCalled) ? (result.methodsCalled as string[]) : []

  return (
    <div className="my-2 space-y-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
      <Collapsible className="w-full">
        <CollapsibleTrigger className="group flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors w-full">
          {isError ? (
            <AlertCircle className="size-3.5 text-destructive" />
          ) : (
            <Terminal className="size-3.5 text-emerald-500" />
          )}

          <span className="font-medium text-foreground">
            {isError ? "Lỗi sandbox" : (t("ai.tool.execute.title") || "Xử lý dữ liệu")}
          </span>

          {methodsCalled.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              <Layers className="size-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">
                {methodsCalled.length} bước
              </span>
            </div>
          )}

          {durationMs !== undefined && (
            <span className="text-[10px] text-muted-foreground ml-auto pr-1">
              {durationMs}ms
            </span>
          )}

          <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-1.5 space-y-1.5">
            {code && (
              <div className="rounded-lg bg-muted/50 p-2.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Kịch bản JS
                </span>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-muted-foreground font-mono">
                  {code}
                </pre>
              </div>
            )}

            {isError && (
              <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                {String(result.error)}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {!isError && isArrayResult(result.output) ? (
        <DataTableView data={result.output} />
      ) : null}
    </div>
  )
}
