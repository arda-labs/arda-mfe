import * as React from "react"
import { currencyDecimals } from "@workspace/format"
import {
  caretAfterReformat,
  formatMoneyText,
  parseMoneyText,
} from "@workspace/ui/lib/money-text"
import { cn } from "@workspace/ui/lib/utils"

/** Event-shaped payload, same contract as DateField / SelectField:
 * `e.target.value` and react-hook-form `register()` both work. */
export type MoneyInputChangeEvent = {
  type: "change" | "blur"
  target: { name?: string; value: string }
}

export type MoneyInputHandle = {
  value: string
  name?: string
  focus: () => void
}

export type MoneyInputProps = {
  id?: string
  name?: string
  /** Canonical amount in major units ("1250000", "1234.5"), "" when empty. */
  value?: string | number
  defaultValue?: string | number
  onChange?: (event: MoneyInputChangeEvent) => void
  onBlur?: (event: MoneyInputChangeEvent) => void
  /** Decides how many decimals may be typed (VND: none). Default VND. */
  currency?: string
  allowNegative?: boolean
  /** Unit shown inside the field on the right ("₫", "USD"). */
  suffix?: React.ReactNode
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  placeholder?: string
  /** Wrapper classes (width, layout). */
  className?: string
  /** Input classes (height, text size) for dense table cells. */
  inputClassName?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-describedby"?: string
  "aria-label"?: string
}

const toCanonical = (value: string | number | undefined) =>
  value === undefined || value === null ? "" : String(value)

/**
 * Amount field (design board 09): right-aligned tabular digits, grouped as
 * you type ("1.250.000"), decimal comma only for currencies that have one.
 * The value the form sees is a plain number string, never the display text.
 */
export const MoneyInput = React.forwardRef<MoneyInputHandle, MoneyInputProps>(
  function MoneyInput(
    {
      id,
      name,
      value,
      defaultValue,
      onChange,
      onBlur,
      currency = "VND",
      allowNegative = false,
      suffix,
      disabled,
      readOnly,
      required,
      placeholder,
      className,
      inputClassName,
      ...aria
    },
    ref
  ) {
    const decimals = currencyDecimals(currency)
    const controlled = value !== undefined
    const [inner, setInner] = React.useState(toCanonical(defaultValue))
    const canonical = controlled ? toCanonical(value) : inner
    const [text, setText] = React.useState(() => formatMoneyText(canonical, decimals))
    const inputRef = React.useRef<HTMLInputElement>(null)
    const canonicalRef = React.useRef(canonical)
    React.useLayoutEffect(() => {
      canonicalRef.current = canonical
    }, [canonical])

    // Follow outside changes (reset, setValue, parent state) unless the text
    // already means that amount (e.g. "1.234," while typing decimals).
    const [lastCanonical, setLastCanonical] = React.useState(canonical)
    if (canonical !== lastCanonical) {
      setLastCanonical(canonical)
      if (parseMoneyText(text, decimals, allowNegative).canonical !== canonical) {
        setText(formatMoneyText(canonical, decimals))
      }
    }

    React.useImperativeHandle(
      ref,
      () => ({
        get value() {
          return canonicalRef.current
        },
        set value(next: string) {
          const normalized = toCanonical(next)
          canonicalRef.current = normalized
          setInner(normalized)
          setText(formatMoneyText(normalized, decimals))
        },
        name,
        focus: () => inputRef.current?.focus(),
      }),
      [name, decimals]
    )

    const pendingCaret = React.useRef<number | null>(null)
    React.useLayoutEffect(() => {
      if (pendingCaret.current === null || !inputRef.current) return
      inputRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }, [text])

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const raw = event.target.value
      const next = parseMoneyText(raw, decimals, allowNegative)
      pendingCaret.current = caretAfterReformat(
        raw,
        event.target.selectionStart ?? raw.length,
        next.display
      )
      setText(next.display)
      if (next.canonical !== canonicalRef.current) {
        canonicalRef.current = next.canonical
        if (!controlled) setInner(next.canonical)
        onChange?.({ type: "change", target: { name, value: next.canonical } })
      }
    }

    function handleBlur() {
      // "1.234," or a lone "-" tidy up to the amount they stand for.
      setText(formatMoneyText(canonicalRef.current, decimals))
      onBlur?.({ type: "blur", target: { name, value: canonicalRef.current } })
    }

    return (
      <div className={cn("relative", className)}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          placeholder={placeholder}
          data-slot="money-input"
          className={cn(
            "flex h-control w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-right text-sm tabular-nums shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30",
            suffix ? "pr-12" : null,
            inputClassName
          )}
          {...aria}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    )
  }
)
