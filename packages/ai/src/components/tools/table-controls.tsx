import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

// normalizeText lowercases and strips Vietnamese diacritics so a search for
// "du no" matches "Dư nợ" and "nợ xấu" matches "no xau"-style queries.
export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
}

export const DEFAULT_PAGE_SIZES = [10, 25, 50, 100] as const

export function TableSearchInput({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const { t } = useI18n()
  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("ai.table.search") || "Tìm trong bảng…"}
          className="h-7 pl-7 text-[11px]"
          aria-label={t("ai.table.search") || "Tìm trong bảng"}
        />
      </div>
    </div>
  )
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = DEFAULT_PAGE_SIZES,
}: {
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizes?: readonly number[]
}) {
  const { t } = useI18n()
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground">
      {onPageSizeChange && (
        <div className="flex items-center gap-1.5">
          <span>{t("ai.table.page_size") || "Số dòng"}</span>
          <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger className="h-6 w-14 px-1.5 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-[11px]">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <span className="ml-auto tabular-nums">
        {t("ai.table.range", { from, to, total }) || `${from}–${to} / ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={t("ai.table.prev") || "Trang trước"}
          title={t("ai.table.prev") || "Trang trước"}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <span className="min-w-[3rem] text-center tabular-nums">
          {page}/{Math.max(1, pageCount)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label={t("ai.table.next") || "Trang sau"}
          title={t("ai.table.next") || "Trang sau"}
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
