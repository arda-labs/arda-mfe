import { useMemo, useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarIcon, XCircle } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

export function DatePopover({
  value,
  onChange,
  label,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  label: string
}) {
  const { t, locale, formatDate } = useI18n()
  const isVi = locale === "vi-VN" || locale?.startsWith("vi")

  const [open, setOpen] = useState(false)
  const selected = useMemo(
    () => (value ? new Date(value + "T00:00:00") : undefined),
    [value]
  )
  const [viewDate, setViewDate] = useState(() => selected ?? new Date())

  // Khi mở Popover, tự động đồng bộ viewDate theo ngày đang chọn (hoặc hôm nay)
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setViewDate(selected ?? new Date())
    }
    setOpen(nextOpen)
  }

  // Cập nhật viewDate khi selected bên ngoài thay đổi
  useEffect(() => {
    if (selected) {
      setViewDate(selected)
    }
  }, [selected])

  const today = useMemo(() => new Date(), [])
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()
  const weeks: (number | null)[][] = []
  let day = 1
  for (let r = 0; r < 6; r++) {
    const row: (number | null)[] = []
    for (let c = 0; c < 7; c++) {
      if ((r === 0 && c < firstDow) || day > daysInMonth) {
        row.push(null)
      } else {
        row.push(day++)
      }
    }
    weeks.push(row)
    if (day > daysInMonth) break
  }

  const years = useMemo(() => {
    const currentY = new Date().getFullYear()
    const ys: number[] = []
    for (let y = currentY - 10; y <= currentY + 10; y++) ys.push(y)
    return ys
  }, [])

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date(2020, i, 1)
        return {
          value: i,
          label: isVi
            ? `Tháng ${i + 1}`
            : d.toLocaleString(locale || "en-US", { month: "long" }),
        }
      }),
    [isVi, locale]
  )

  const weekdays = useMemo(
    () =>
      isVi
        ? ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
        : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    [isVi]
  )

  function isSelected(d: number) {
    if (!selected) return false
    return (
      selected.getFullYear() === year &&
      selected.getMonth() === month &&
      selected.getDate() === d
    )
  }

  function isToday(d: number) {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    )
  }

  const handleSelectToday = () => {
    const now = new Date()
    setViewDate(now)
    onChange(format(now, "yyyy-MM-dd"))
    setOpen(false)
  }

  const formattedDisplay = useMemo(() => {
    if (!selected) return null
    if (formatDate) {
      return formatDate(selected, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    }
    return format(selected, "dd/MM/yyyy")
  }, [selected, formatDate])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 min-w-[130px] justify-start gap-2 px-3 font-normal",
            !selected && "border-dashed text-muted-foreground"
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          {selected ? (
            <>
              <span className="truncate">
                {label}: {formattedDisplay}
              </span>
              <div
                role="button"
                aria-label={t("action.clear_date") || "Clear date"}
                tabIndex={0}
                className="ml-auto rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(undefined)
                }}
              >
                <XCircle className="size-3.5" />
              </div>
            </>
          ) : (
            <span>{label}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        {/* Header: tháng + năm dropdown */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <select
            value={month}
            onChange={(e) =>
              setViewDate(new Date(year, Number(e.target.value)))
            }
            className="h-8 flex-1 rounded-md border bg-background px-2 text-sm font-medium focus-visible:ring-1 focus-visible:ring-ring"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) =>
              setViewDate(new Date(Number(e.target.value), month))
            }
            className="h-8 w-24 rounded-md border bg-background px-2 text-sm font-medium focus-visible:ring-1 focus-visible:ring-ring"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Thứ */}
        <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
          {weekdays.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Lưới ngày */}
        <div className="grid grid-cols-7 gap-0.5">
          {weeks.flat().map((d, i) =>
            d ? (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const picked = new Date(year, month, d)
                  onChange(format(picked, "yyyy-MM-dd"))
                  setOpen(false)
                }}
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-md text-sm transition-colors",
                  isSelected(d)
                    ? "bg-primary font-medium text-primary-foreground"
                    : isToday(d)
                      ? "bg-accent font-semibold text-accent-foreground border border-primary/40"
                      : "text-foreground hover:bg-muted"
                )}
              >
                {d}
              </button>
            ) : (
              <div key={i} />
            )
          )}
        </div>

        {/* Footer: Clear + Hôm nay */}
        <div className="mt-3 flex items-center justify-between border-t pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              onChange(undefined)
              setOpen(false)
            }}
          >
            {t("action.clear") || (isVi ? "Xoá" : "Clear")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium"
            onClick={handleSelectToday}
          >
            {t("date.today") || (isVi ? "Hôm nay" : "Today")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
