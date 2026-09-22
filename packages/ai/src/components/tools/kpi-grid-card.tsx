import { textValue, type ToolResultPayload } from "../../lib/messages"
import { registerToolRenderer } from "../../lib/registry"

// KpiGrid renders the `kpis` array from the report-presentation contract:
// one headline figure per card, already labelled and unit-tagged by the server.
export function isKpiPayload(value: unknown): value is { kpis: unknown[] } {
  if (typeof value !== "object" || value === null) return false
  return Array.isArray((value as Record<string, unknown>).kpis)
}

export function isKpiResult(result: ToolResultPayload): boolean {
  return isKpiPayload(result)
}

export function KpiGrid({ kpis, title }: { kpis: unknown[]; title?: string }) {
  const items = kpis.filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null
  )
  if (items.length === 0) return null

  return (
    <div className="space-y-1.5">
      {title && <p className="text-xs font-medium text-foreground">{title}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => {
          const label = textValue(item.label, textValue(item.code, `KPI ${index + 1}`))
          const value = textValue(item.value)
          const unit = textValue(item.unit)
          return (
            <div
              key={`${textValue(item.code, "kpi")}-${index}`}
              className="rounded-lg border bg-muted/20 px-3 py-2"
            >
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                {value || "—"}
                {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function registerKpiRenderer() {
  registerToolRenderer({
    id: "arda.statistical-kpi",
    match: isKpiResult,
    component: KpiResultView,
  })
}

function KpiResultView({ result }: { result: ToolResultPayload }) {
  return <KpiGrid kpis={result.kpis as unknown[]} />
}
