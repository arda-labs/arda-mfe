import { useMemo, useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, XCircle } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Filter chip that picks one ISO date ("Từ ngày: 01/10/2026" with a clear
 * button). The popup is the shared Calendar, so it matches DateField:
 * Monday first, month/year dropdowns, "Xóa" and "Hôm nay" under the grid.
 */
export function DatePopover({
  value,
  onChange,
  label,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  label: string
}) {
  const { t, formatDate } = useI18n()
  const [open, setOpen] = useState(false)
  const selected = useMemo(
    () => (value ? new Date(value + "T00:00:00") : undefined),
    [value]
  )

  const pick = (date: Date | undefined) => {
    onChange(date ? format(date, "yyyy-MM-dd") : undefined)
    setOpen(false)
  }

  const formattedDisplay = selected
    ? formatDate(selected, { day: "2-digit", month: "2-digit", year: "numeric" })
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
                aria-label={t("action.clear_date")}
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
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (date) pick(date)
          }}
          onToday={() => pick(new Date())}
          onClear={selected ? () => pick(undefined) : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
