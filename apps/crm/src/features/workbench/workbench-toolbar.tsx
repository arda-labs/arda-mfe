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
}: WorkbenchToolbarProps) {
  const { t } = useI18n()
  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== null && v !== ""
  )

  const setFilter = (key: keyof FilterState, value: string | null | undefined) => {
    onChange({ ...filters, [key]: value || null })
  }

  const clearAll = () => {
    onChange({})
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={keywordPlaceholder ?? t("crm.workbench.keyword_placeholder")}
          value={filters.keyword ?? ""}
          onChange={(e) => setFilter("keyword", e.target.value || null)}
          className="h-8 w-56 pl-8"
        />
      </div>
      <DatePopover
        value={filters.fromDate ?? undefined}
        onChange={(v) => setFilter("fromDate", v ?? null)}
        label="Từ ngày"
      />
      <DatePopover
        value={filters.toDate ?? undefined}
        onChange={(v) => setFilter("toDate", v ?? null)}
        label="Đến ngày"
      />
      {presets.includes("accounting") && (
        <SelectPopover
          value={filters.accounting ?? undefined}
          onChange={(v) => setFilter("accounting", v || null)}
          label="Loại hạch toán"
          options={[
            { label: "Tất cả", value: "" },
            { label: "Có hạch toán", value: "POSTED" },
            { label: "Không hạch toán", value: "NOT_POSTED" },
          ]}
        />
      )}
      {presets.includes("slaStatus") && (
        <SelectPopover
          value={filters.slaStatus ?? undefined}
          onChange={(v) => setFilter("slaStatus", v || null)}
          label="Trạng thái SLA"
          options={[
            { label: "Tất cả", value: "" },
            { label: "Đạt SLA", value: "MET" },
            { label: "Không đạt SLA", value: "BREACHED" },
          ]}
        />
      )}
      {presets.includes("transactionStatus") && (
        <SelectPopover
          value={filters.transactionStatus ?? undefined}
          onChange={(v) => setFilter("transactionStatus", v || null)}
          label="Trạng thái giao dịch"
          options={[
            { label: "Tất cả", value: "" },
            { label: "Đã gửi", value: "SUBMITTED" },
            { label: "Đang xử lý", value: "IN_REVIEW" },
            { label: "Hoàn tất", value: "COMPLETED" },
            { label: "Từ chối", value: "REJECTED" },
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
          Xoá bộ lọc
        </Button>
      )}
    </div>
  )
}
