import { Search, XCircle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { DatePopover } from "@workspace/ui/components/date-popover"
import { Input } from "@workspace/ui/components/input"
import { SelectPopover } from "@workspace/ui/components/select-popover"
import { useI18n } from "@workspace/i18n"

export interface FilterState {
  keyword?: string | null
  fromDate?: string | null
  toDate?: string | null
  accounting?: string | null
  slaStatus?: string | null
  transactionStatus?: string | null
}

export type FilterPreset = "accounting" | "slaStatus" | "transactionStatus"

interface WorkbenchToolbarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  presets: FilterPreset[]
  keywordPlaceholder?: string
}

export function WorkbenchToolbar({
  filters,
  onChange,
  presets,
  keywordPlaceholder,
  resultCount,
}: WorkbenchToolbarProps & { resultCount?: number }) {
  const { t } = useI18n()
  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== null && v !== ""
  )

  const setFilter = (
    key: keyof FilterState,
    value: string | null | undefined
  ) => {
    onChange({ ...filters, [key]: value || null })
  }

  const clearAll = () => {
    onChange({})
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              keywordPlaceholder ?? t("workflow.workbench.keyword_placeholder")
            }
            value={filters.keyword ?? ""}
            onChange={(e) => setFilter("keyword", e.target.value || null)}
            className="h-8 w-56 pl-8"
          />
        </div>
        <DatePopover
          value={filters.fromDate ?? undefined}
          onChange={(v) => setFilter("fromDate", v ?? null)}
          label={t("workflow.workbench.filter_from_date")}
        />
        <DatePopover
          value={filters.toDate ?? undefined}
          onChange={(v) => setFilter("toDate", v ?? null)}
          label={t("workflow.workbench.filter_to_date")}
        />
        {presets.includes("accounting") && (
          <SelectPopover
            value={filters.accounting ?? undefined}
            onChange={(v) => setFilter("accounting", v || null)}
            label={t("workflow.workbench.filter_accounting")}
            options={[
              { label: t("workflow.workbench.accounting_all"), value: "" },
              { label: t("workflow.workbench.accounting_posted"), value: "POSTED" },
              { label: t("workflow.workbench.accounting_not_posted"), value: "NOT_POSTED" },
            ]}
          />
        )}
        {presets.includes("slaStatus") && (
          <SelectPopover
            value={filters.slaStatus ?? undefined}
            onChange={(v) => setFilter("slaStatus", v || null)}
            label={t("workflow.workbench.filter_sla_status")}
            options={[
              { label: t("workflow.workbench.sla_all"), value: "" },
              { label: t("workflow.workbench.sla_met"), value: "MET" },
              { label: t("workflow.workbench.sla_breached"), value: "BREACHED" },
            ]}
          />
        )}
        {presets.includes("transactionStatus") && (
          <SelectPopover
            value={filters.transactionStatus ?? undefined}
            onChange={(v) => setFilter("transactionStatus", v || null)}
            label={t("workflow.workbench.filter_transaction_status")}
            options={[
              { label: t("workflow.workbench.accounting_all"), value: "" },
              { label: t("workflow.workbench.status_submitted"), value: "SUBMITTED" },
              { label: t("workflow.workbench.status_in_review"), value: "IN_REVIEW" },
              { label: t("workflow.workbench.status_completed"), value: "COMPLETED" },
              { label: t("workflow.workbench.status_rejected"), value: "REJECTED" },
            ]}
          />
        )}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={clearAll}
          >
            <XCircle className="size-3.5" />
            {t("workflow.workbench.filter_clear")}
          </Button>
        )}
      </div>

      {/* Bottom bar: result count + active filter pills */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {resultCount !== undefined ? (
          <span className="font-medium tabular-nums">
            {t("workflow.workbench.result_count", { count: resultCount })}
          </span>
        ) : null}
        {Object.entries(filters)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium"
            >
              {filterLabel(key, value as string, t)}
              <button
                type="button"
                className="ml-0.5 hover:text-foreground"
                onClick={() => setFilter(key as keyof FilterState, null)}
              >
                <XCircle className="size-3" />
              </button>
            </span>
          ))}
      </div>
    </div>
  )
}

function filterLabel(
  key: string,
  value: string,
  t: ReturnType<typeof useI18n>["t"]
) {
  const labels: Record<string, string> = {
    keyword: t("workflow.workbench.filter_keyword", { value }),
    fromDate: t("workflow.workbench.filter_from", { value }),
    toDate: t("workflow.workbench.filter_to", { value }),
    accounting:
      value === "POSTED"
        ? t("workflow.workbench.filter_accounting_posted")
        : t("workflow.workbench.filter_accounting_not_posted"),
    slaStatus:
      value === "MET"
        ? t("workflow.workbench.filter_sla_met")
        : t("workflow.workbench.filter_sla_breached"),
    transactionStatus:
      value === "SUBMITTED"
        ? t("workflow.workbench.status_submitted")
        : value === "IN_REVIEW"
          ? t("workflow.workbench.status_in_review")
          : value === "COMPLETED"
            ? t("workflow.workbench.status_completed")
            : t("workflow.workbench.status_rejected"),
  }
  return labels[key] ?? value
}
