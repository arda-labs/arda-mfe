import * as React from "react"
import { vi } from "date-fns/locale"
import { CalendarDays } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  dateTextToIso,
  dateToIso,
  isoToDate,
  isoToDateText,
  maskDateText,
} from "@workspace/ui/lib/date-text"
import { cn } from "@workspace/ui/lib/utils"

/** Event-shaped payload so DateField drops in where <input type="date"> was:
 * react-hook-form `register()` and `e.target.value` handlers both work. */
export type DateFieldChangeEvent = {
  type: "change" | "blur"
  target: { name?: string; value: string }
}

/** What react-hook-form sees through `ref`: it reads/writes `.value`. */
export type DateFieldHandle = {
  value: string
  name?: string
  focus: () => void
}

export type DateFieldProps = {
  id?: string
  name?: string
  /** ISO date "yyyy-MM-dd", or "" when empty. */
  value?: string
  defaultValue?: string
  onChange?: (event: DateFieldChangeEvent) => void
  onBlur?: (event: DateFieldChangeEvent) => void
  /** ISO bounds; days outside are disabled in the calendar. Numbers are
   * accepted (and ignored) because register() types min/max that way. */
  min?: string | number
  max?: string | number
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  placeholder?: string
  className?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-describedby"?: string
  "aria-label"?: string
}

/**
 * Date input shown as dd/MM/yyyy (typed with auto slashes, or picked in a
 * calendar) while the value stays an ISO date. Replaces native date inputs,
 * whose display followed the browser locale.
 */
export const DateField = React.forwardRef<DateFieldHandle, DateFieldProps>(
  function DateField(
    {
      id,
      name,
      value,
      defaultValue,
      onChange,
      onBlur,
      min,
      max,
      disabled,
      readOnly,
      required,
      placeholder,
      className,
      ...aria
    },
    ref
  ) {
    const { t, locale } = useI18n()
    const controlled = value !== undefined
    const [innerIso, setInnerIso] = React.useState(defaultValue ?? "")
    const iso = controlled ? value : innerIso
    const [text, setText] = React.useState(() => isoToDateText(iso))
    const [open, setOpen] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const isoRef = React.useRef(iso)
    React.useLayoutEffect(() => {
      isoRef.current = iso
    }, [iso])

    // Keep the visible text in step with value changes from outside (reset,
    // setValue, a controlled parent) unless the user is mid-typing a date.
    const [lastIso, setLastIso] = React.useState(iso)
    if (iso !== lastIso) {
      setLastIso(iso)
      if (dateTextToIso(text) !== iso) setText(isoToDateText(iso))
    }

    React.useImperativeHandle(
      ref,
      () => ({
        get value() {
          return isoRef.current
        },
        set value(next: string) {
          const normalized = next ?? ""
          isoRef.current = normalized
          setInnerIso(normalized)
          setText(isoToDateText(normalized))
        },
        name,
        focus: () => inputRef.current?.focus(),
      }),
      [name]
    )

    function commit(nextIso: string) {
      if (!controlled) setInnerIso(nextIso)
      isoRef.current = nextIso
      onChange?.({ type: "change", target: { name, value: nextIso } })
    }

    function handleText(event: React.ChangeEvent<HTMLInputElement>) {
      const masked = maskDateText(event.target.value)
      setText(masked)
      if (masked === "") {
        if (iso !== "") commit("")
        return
      }
      const parsed = dateTextToIso(masked)
      if (parsed && parsed !== iso) commit(parsed)
    }

    function handleBlur() {
      // An unfinished or impossible date snaps back to the last valid one.
      if (text !== "" && !dateTextToIso(text)) setText(isoToDateText(iso))
      onBlur?.({ type: "blur", target: { name, value: isoRef.current } })
    }

    const selected = isoToDate(iso)
    const minDate = typeof min === "string" ? isoToDate(min) : undefined
    const maxDate = typeof max === "string" ? isoToDate(max) : undefined
    const inactive = disabled || readOnly
    const today = new Date()
    const todayAllowed =
      (!minDate || dateToIso(today) >= dateToIso(minDate)) &&
      (!maxDate || dateToIso(today) <= dateToIso(maxDate))

    function pick(nextIso: string) {
      setText(isoToDateText(nextIso))
      commit(nextIso)
      setOpen(false)
      inputRef.current?.focus()
    }

    return (
      <div
        className={cn(
          "flex h-control w-full items-center rounded-md border border-input bg-background shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 has-[[aria-invalid=true]]:border-destructive dark:bg-input/30",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={handleText}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          placeholder={placeholder ?? t("common.date_field.placeholder")}
          className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-sm tabular-nums outline-none placeholder:font-sans placeholder:text-muted-foreground disabled:cursor-not-allowed"
          {...aria}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={inactive}
              aria-label={t("common.date_field.open_calendar")}
              className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none"
            >
              <CalendarDays className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              locale={locale === "en-US" ? undefined : vi}
              selected={selected}
              onToday={todayAllowed ? () => pick(dateToIso(today)) : undefined}
              onClear={iso && !required ? () => pick("") : undefined}
              defaultMonth={selected ?? maxDate ?? undefined}
              captionLayout="dropdown"
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
              onSelect={(date) => {
                if (date) pick(dateToIso(date))
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)
