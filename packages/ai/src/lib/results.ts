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

// Builds a widget payload from tool-call args when the result is missing or
// degraded (same fields; the `widget` marker only exists on the result).
export function widgetPayloadFromArgs(args: unknown): WidgetPayload | null {
  if (typeof args !== "object" || args === null) return null
  const candidate = { ...(args as Record<string, unknown>), widget: true }
  return isWidgetPayload(candidate) ? candidate : null
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
