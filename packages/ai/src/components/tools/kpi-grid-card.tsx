import { textValue, type ToolResultPayload } from "../../lib/messages"
import { registerToolRenderer } from "../../lib/registry"

// KpiGrid renders the `kpis` array from the report-presentation contract:
// one headline figure per card, labelled and unit-tagged by the server. Values
// are formatted here (tỷ/triệu VNĐ, %) so a card reads like a report header
// rather than a raw number.
export function isKpiPayload(value: unknown): value is { kpis: unknown[] } {
  if (typeof value !== "object" || value === null) return false
  return Array.isArray((value as Record<string, unknown>).kpis)
}

export function isKpiResult(result: ToolResultPayload): boolean {
  return isKpiPayload(result)
}

function formatAmount(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ VNĐ`
  if (abs >= 1e6) return `${(value / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} triệu VNĐ`
  return `${value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} VNĐ`
}

function accentFor(unit: string): string {
  const lower = unit.toLowerCase()
  if (lower.includes("vnd") || lower.includes("đ")) return "border-l-blue-500"
  if (lower.includes("%")) return "border-l-amber-500"
  return "border-l-slate-400"
}

function renderValue(value: unknown, unit: string): { display: string; suffix: string } {
  const text = value === null || value === undefined ? "" : String(value).trim()
  if (text === "") return { display: "—", suffix: "" }
  const numeric = Number(text)
  const isMoney = /vnd|đồng|dong|đ$/i.test(unit)
  if (Number.isFinite(numeric) && isMoney) {
    return { display: formatAmount(numeric), suffix: "" }
  }
  return { display: text, suffix: unit }
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
          const unit = textValue(item.unit)
          const { display, suffix } = renderValue(item.value, unit)
          return (
            <div
              key={`${textValue(item.code, "kpi")}-${index}`}
              className={`rounded-lg border border-l-4 bg-muted/20 px-3 py-2 ${accentFor(unit)}`}
            >
              <p className="text-[11px] text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
                {display}
                {suffix && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">{suffix}</span>
                )}
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
