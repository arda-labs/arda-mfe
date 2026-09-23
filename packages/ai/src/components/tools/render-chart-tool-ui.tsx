import { makeAssistantToolUI } from "@assistant-ui/react"
import { ReportPresentationCard } from "./report-presentation-card"
import type { ToolResultPayload } from "../../lib/messages"

// renderChart is a first-class output (a chart), not a processing step, so its
// UI opts into `display: "standalone"`. That takes the tool-call out of the
// chain-of-thought activity group, which collapses once the turn settles and
// would otherwise hide the chart behind "Đã xử lý trong Xs".
export const RenderChartToolUI = makeAssistantToolUI<
  Record<string, unknown>,
  Record<string, unknown>
>({
  toolName: "renderChart",
  display: "standalone",
  render: ({ result }) =>
    result ? <ReportPresentationCard result={result as ToolResultPayload} /> : null,
})
