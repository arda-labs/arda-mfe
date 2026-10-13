import { api, type ApiSuccess } from "@workspace/api"

// Real ids look like `tenant|actor|thread:hex` (contain `|` and `:`), up to 512
// bytes; the BE validates the grammar, the FE only refuses empty/oversized ids
// and always percent-encodes the path segment.
const RESULT_ID_MAX = 512

export type WidgetPayload = {
  widget: true
  title: string
  html: string
  css?: string
  js: string
  data?: unknown
  result_id?: string
  inputs_summary: string
}

export function isWidgetPayload(value: unknown): value is WidgetPayload {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.widget === true &&
    typeof v.title === "string" &&
    typeof v.html === "string" &&
    typeof v.js === "string" &&
    typeof v.inputs_summary === "string"
  )
}

export type WidgetViewKind = "none" | "widget" | "generic"

// What the renderWidget tool UI shows. A widget mounts ONLY from a result the
// backend validated and marked `widget === true`; tool-call args are model text
// that the backend may have refused (flag off, forbidden pattern, size limit)
// and are never a source for the iframe. A result that is present but is not a
// widget payload (e.g. a validation error) gets the same generic tool view the
// panel uses for any other tool. While the call runs, or when no result ever
// arrived, nothing renders.
export function widgetViewKind(result: unknown, status: string | undefined): WidgetViewKind {
  if (status === "running") return "none"
  if (isWidgetPayload(result)) return "widget"
  if (result != null) return "generic"
  return "none"
}

// Which tool UI replays a persisted artifact when a thread is reopened. Widget
// artifacts carry the same full payload as the live result; everything else
// (charts, KPI grids) keeps replaying through renderChart.
export function artifactToolName(artifact: unknown): "renderWidget" | "renderChart" {
  return isWidgetPayload(artifact) ? "renderWidget" : "renderChart"
}

export function buildResultPath(resultId: string, threadId: string): string {
  if (resultId.length === 0 || resultId.length > RESULT_ID_MAX) {
    throw new Error("invalid result id")
  }
  return `/api/ai/results/${encodeURIComponent(resultId)}?thread_id=${encodeURIComponent(threadId)}`
}

// Hydrates a widget that referenced an execute() result instead of inlining
// its data. The endpoint is owner- and thread-scoped on the server.
export async function fetchExecuteResult(
  resultId: string,
  threadId: string,
  signal?: AbortSignal
): Promise<unknown> {
  const response = await api.get<ApiSuccess<{ output: unknown }>>(
    buildResultPath(resultId, threadId),
    { signal }
  )
  return response.result.output
}
