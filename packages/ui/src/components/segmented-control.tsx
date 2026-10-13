import * as React from "react"
import type { LucideIcon } from "lucide-react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { cn } from "@workspace/ui/lib/utils"

export type SegmentedOption<T extends string = string> = {
  value: T
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

/** Same event shape as SelectField, so `register()` works on both. */
export type SegmentedChangeEvent = {
  type: "change" | "blur"
  target: { name?: string; value: string }
}

export type SegmentedControlHandle = {
  value: string
  name?: string
  focus: () => void
}

export type SegmentedControlProps<T extends string = string> = {
  options: SegmentedOption<T>[]
  value?: T
  defaultValue?: T
  /** Controlled usage. */
  onValueChange?: (value: T) => void
  /** Form usage (react-hook-form `register()`), mirrors SelectField. */
  name?: string
  onChange?: (event: SegmentedChangeEvent) => void
  onBlur?: (event: SegmentedChangeEvent) => void
  size?: "sm" | "default"
  /** Stretch segments to the container width (forms) instead of hugging. */
  fullWidth?: boolean
  disabled?: boolean
  id?: string
  className?: string
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-describedby"?: string
}

function SegmentedControlInner<T extends string = string>(
  {
    options,
    value,
    defaultValue,
    onValueChange,
    name,
    onChange,
    onBlur,
    size = "default",
    fullWidth = false,
    disabled,
    id,
    className,
    "aria-invalid": ariaInvalid,
    ...aria
  }: SegmentedControlProps<T>,
  ref: React.ForwardedRef<SegmentedControlHandle>
) {
  const controlled = value !== undefined
  const [inner, setInner] = React.useState<string>(defaultValue ?? "")
  const current = controlled ? value : inner
  const currentRef = React.useRef<string>(current)
  React.useLayoutEffect(() => {
    currentRef.current = current
  }, [current])
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useImperativeHandle(
    ref,
    () => ({
      get value() {
        return currentRef.current
      },
      set value(next: string) {
        currentRef.current = next ?? ""
        setInner(next ?? "")
      },
      name,
      focus: () =>
        rootRef.current
          ?.querySelector<HTMLButtonElement>("[data-state=on], button")
          ?.focus(),
    }),
    [name]
  )

  return (
    <ToggleGroupPrimitive.Root
      ref={rootRef}
      id={id}
      type="single"
      value={current}
      onValueChange={(next) => {
        // One segment is always selected: ignore the deselect Radix reports.
        if (!next) return
        if (!controlled) setInner(next)
        currentRef.current = next
        onValueChange?.(next as T)
        onChange?.({ type: "change", target: { name, value: next } })
      }}
      onBlur={(event) => {
        if (rootRef.current?.contains(event.relatedTarget as Node | null)) return
        onBlur?.({ type: "blur", target: { name, value: currentRef.current } })
      }}
      disabled={disabled}
      data-slot="segmented-control"
      aria-invalid={ariaInvalid}
      className={cn(
        "items-center gap-0.5 rounded-lg bg-muted p-0.5 aria-invalid:ring-2 aria-invalid:ring-destructive/30",
        fullWidth ? "flex w-full" : "inline-flex w-fit",
        className
      )}
      {...aria}
    >
      {options.map(({ value: optionValue, label, icon: Icon, disabled: optionDisabled }) => (
        <ToggleGroupPrimitive.Item
          key={optionValue}
          value={optionValue}
          disabled={optionDisabled}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-md px-3 font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs [&_svg]:size-3.5 [&_svg]:shrink-0",
            size === "sm"
              ? "h-[calc(var(--control-height-sm)-4px)] text-xs"
              : "h-[calc(var(--control-height)-4px)] text-sm",
            fullWidth && "flex-1"
          )}
        >
          {Icon ? <Icon aria-hidden /> : null}
          {label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  )
}

/**
 * Two or three mutually exclusive choices shown at once (design board 09:
 * ≤ 3 options → segmented, more → SelectField). One segment is always
 * selected. Works controlled (`value` + `onValueChange`) or as a drop-in for
 * SelectField under react-hook-form (`{...register("field")}`).
 */
export const SegmentedControl = React.forwardRef(SegmentedControlInner) as <
  T extends string = string,
>(
  props: SegmentedControlProps<T> & { ref?: React.Ref<SegmentedControlHandle> }
) => React.ReactElement
