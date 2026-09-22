import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  ChevronDown,
  Search,
  AlertCircle,
  Layers,
  CircleCheck,
  LoaderCircle,
} from "lucide-react"
import { makeAssistantToolUI, useToolCallElapsed } from "@assistant-ui/react"
import { DataTableView, isArrayResult } from "./data-table-view"
import { ApprovalCard } from "./approval-card"
import { extractApprovalProposal, type ToolResultPayload } from "../../lib/messages"
import { resolveToolRenderer } from "../../lib/registry"

// Live wall-clock seconds for the running tool call, provided by the
// library's part timing (startedAt set by the SSE adapter).
function ToolElapsedBadge() {
  const elapsedMs = useToolCallElapsed()
  if (elapsedMs === undefined || elapsedMs < 1500) return null
  return (
    <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
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
      <div className="flex items-center gap-2 py-0.5 text-xs text-muted-foreground">
        <LoaderCircle className="size-3 shrink-0 animate-spin text-primary" />
        <span className="min-w-0 truncate">
          {t("ai.tool.search.pending")}{" "}
          {query && (
            <strong className="font-medium text-foreground">{query}</strong>
          )}
        </span>
        <ToolElapsedBadge />
      </div>
    )
  }

  if (!result) return null

  const signatures = typeof result.signatures === "string" ? result.signatures : ""
  const count = typeof result.count === "number" ? result.count : signatures.split("\n\n").filter(Boolean).length

  return (
    <Collapsible className="w-full motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
        <Search className="size-3.5 shrink-0 text-primary" />
        <span className="text-foreground">
          {t("ai.tool.search.title") || "Khám phá API"}
        </span>
        {count > 0 ? (
          <Badge variant="secondary" className="ml-0.5 h-4.5 px-1.5 text-[10px] font-normal">
            {count} {t("ai.tool.search.methods") || "phương thức"}
          </Badge>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {t("ai.tool.search.empty") || "(Không có API phù hợp)"}
          </span>
        )}
        <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      {signatures && (
        <CollapsibleContent className="overflow-hidden data-open:animate-collapsible-down data-closed:animate-collapsible-up">
          <pre className="mt-1.5 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
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
      <div className="space-y-1.5 py-0.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="size-3 shrink-0 animate-spin text-amber-500" />
          <span>
            {t("ai.tool.execute.pending") ||
              "Đang thực thi kịch bản xử lý trong sandbox an toàn..."}
          </span>
          <ToolElapsedBadge />
        </div>
        {code ? (
          <pre className="max-h-28 overflow-hidden whitespace-pre-wrap rounded-lg bg-muted/40 p-2.5 font-mono text-[11px] leading-5 text-muted-foreground">
            {code}
            <span
              className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-primary/70 motion-safe:animate-pulse"
              aria-hidden="true"
            />
          </pre>
        ) : null}
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

  // A sandbox script that returns a structured object (e.g. the report
  // presentation: chart + KPI + rows) should render through the same registry
  // as a direct tool result, instead of being dropped. Arrays keep the generic
  // table renderer; anything else falls through to the raw view.
  const rawOutput = result.output
  const renderableOutput =
    !isError && typeof rawOutput === "object" && rawOutput !== null && !Array.isArray(rawOutput)
      ? (rawOutput as ToolResultPayload)
      : undefined
  const outputEntry = renderableOutput ? resolveToolRenderer(renderableOutput) : undefined

  return (
    <div className="space-y-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
      <Collapsible className="w-full">
        <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          {isError ? (
            <AlertCircle className="size-3.5 shrink-0 text-destructive" />
          ) : (
            <CircleCheck className="size-3.5 shrink-0 text-emerald-500" />
          )}

          <span className="font-medium text-foreground">
            {isError
              ? t("ai.tool.execute.error_title") || "Lỗi xử lý dữ liệu"
              : t("ai.tool.execute.title") || "Xử lý dữ liệu"}
          </span>

          {methodsCalled.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Layers className="size-3" />
              {methodsCalled.length} {t("ai.tool.execute.steps_suffix") || "bước"}
            </span>
          )}

          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {durationMs !== undefined && (
              <span className="text-[10px] tabular-nums text-muted-foreground/70">
                {durationMs}ms
              </span>
            )}
            <ChevronDown className="size-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden data-open:animate-collapsible-down data-closed:animate-collapsible-up">
          <div className="mt-1.5 space-y-1.5">
            {code && (
              <div className="rounded-lg bg-muted/50 p-2.5">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("ai.tool.execute.script") || "Kịch bản JS"}
                </span>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted-foreground">
                  {code}
                </pre>
              </div>
            )}

            {methodsCalled.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-2.5">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("ai.tool.execute.steps") || "Các bước đã chạy"}
                </span>
                <ol className="space-y-1">
                  {methodsCalled.map((method, index) => (
                    <li
                      key={`${method}-${index}`}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <CircleCheck className="size-3 shrink-0 text-emerald-500" />
                      <code className="font-mono">{method}</code>
                    </li>
                  ))}
                </ol>
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

      {!isError && outputEntry && renderableOutput ? (
        <outputEntry.component result={renderableOutput} />
      ) : !isError && isArrayResult(result.output) ? (
        <DataTableView data={result.output} />
      ) : null}
    </div>
  )
}
