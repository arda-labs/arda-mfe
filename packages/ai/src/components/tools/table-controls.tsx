import { useRef } from "react"
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
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

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

// isSequenceColumn returns true if the column label designates a row number /
// index column (e.g. "STT", "Số TT", "#", "No.", "Index").
export function isSequenceColumn(label: string | undefined): boolean {
  if (!label) return false
  const clean = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._:\s-]+/g, "")
  return (
    clean === "stt" ||
    clean === "sott" ||
    clean === "sothutu" ||
    clean === "#" ||
    clean === "no" ||
    clean === "idx" ||
    clean === "index"
  )
}

export function TableSearchInput({
  value,
  onChange,
  className,
  placeholder,
  totalCount,
  filteredCount,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  totalCount?: number
  filteredCount?: number
}) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const isFiltering = value.trim().length > 0

  const handleClear = () => {
    onChange("")
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onChange("")
      inputRef.current?.blur()
    }
  }

  return (
    <div
      className={cn(
        "group relative flex items-center transition-[width] duration-200 ease-out",
        "w-36 focus-within:w-52 sm:w-44 sm:focus-within:w-60",
        isFiltering && "w-52 sm:w-60",
        className
      )}
    >
      <Search
        className={cn(
          "pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 transition-colors",
          isFiltering ? "text-primary" : "text-muted-foreground/60 group-focus-within:text-primary"
        )}
      />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t("ai.table.search") || "Tìm trong bảng…"}
        className={cn(
          "h-7 w-full rounded-md border-border/70 bg-card/60 pl-8 text-xs shadow-2xs transition-all",
          "placeholder:text-muted-foreground/50",
          "hover:border-border hover:bg-card/90",
          "focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20",
          isFiltering ? (filteredCount !== undefined ? "pr-16" : "pr-7") : "pr-2.5"
        )}
        aria-label={placeholder || t("ai.table.search") || "Tìm trong bảng"}
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {isFiltering && filteredCount !== undefined && (
          <span
            className={cn(
              "rounded px-1 py-0.5 font-mono text-[9px] font-medium tabular-nums transition-colors",
              filteredCount === 0
                ? "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                : "bg-primary/10 text-primary"
            )}
            title={
              filteredCount === 0
                ? t("ai.table.empty") || "Không có dòng nào khớp"
                : `${filteredCount}${totalCount !== undefined ? `/${totalCount}` : ""} kết quả`
            }
          >
            {filteredCount}
            {totalCount !== undefined ? `/${totalCount}` : ""}
          </span>
        )}
        {isFiltering && (
          <button
            type="button"
            onClick={handleClear}
            className="flex size-4.5 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden"
            aria-label={t("ai.table.clear_search") || "Xóa tìm kiếm"}
            title={t("ai.table.clear_search") || "Xóa tìm kiếm (Esc)"}
          >
            <X className="size-3" />
          </button>
        )}
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
