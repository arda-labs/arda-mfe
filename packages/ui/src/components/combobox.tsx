import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

export type ComboboxOption = {
  value: string
  label: string
  /** Short code shown before the label in mono ("HS-TD · Phòng Tín dụng"). */
  code?: string
  /** Extra text matched by search and shown muted on the right. */
  hint?: string
  /** Indent level for tree data such as org units (0 = root). */
  depth?: number
  disabled?: boolean
}

export type ComboboxProps = {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  id?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Shows a clear button when a value is set. Default true. */
  clearable?: boolean
  /** Search box in the list. Default: only when there are more than 7. */
  searchable?: boolean
  disabled?: boolean
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
  "aria-label"?: string
  onBlur?: () => void
}

/**
 * Searchable single select for forms (design board 06/09). Replaces native
 * <select>: matches on code, label and hint, keeps "mã · tên" visible, and
 * indents tree data. ≤ 3 fixed choices are better as a segmented control.
 */
export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  function Combobox(
    {
      value,
      onChange,
      options,
      id,
      placeholder,
      searchPlaceholder,
      emptyText,
      clearable = true,
      searchable,
      disabled,
      className,
      onBlur,
      ...aria
    },
    ref
  ) {
    const { t } = useI18n()
    const [open, setOpen] = React.useState(false)
    const selected = options.find((option) => option.value === value)

    function choose(next: string) {
      onChange(next)
      setOpen(false)
    }

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) onBlur?.()
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            disabled={disabled}
            className={cn(
              "flex h-control w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-xs transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30",
              className
            )}
            {...aria}
          >
            {selected ? (
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {selected.code ? (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {selected.code}
                  </span>
                ) : null}
                <span className="truncate">{selected.label}</span>
              </span>
            ) : (
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {placeholder ?? t("common.combobox.placeholder")}
              </span>
            )}
            {clearable && selected && !disabled ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label={t("common.combobox.clear")}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onChange("")
                }}
                className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        >
          <Command
            filter={(itemValue, search) =>
              itemValue.toLowerCase().includes(search.trim().toLowerCase())
                ? 1
                : 0
            }
          >
            {(searchable ?? options.length > 7) ? (
              <CommandInput
                placeholder={
                  searchPlaceholder ?? t("common.combobox.search_placeholder")
                }
              />
            ) : null}
            <CommandList>
              <CommandEmpty>{emptyText ?? t("common.combobox.empty")}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={[option.code, option.label, option.hint, option.value]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={option.disabled}
                    onSelect={() => choose(option.value)}
                    className="gap-2"
                    style={
                      option.depth
                        ? { paddingLeft: `${0.5 + option.depth}rem` }
                        : undefined
                    }
                  >
                    <Check
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 text-primary",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.code ? (
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {option.code}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                    </span>
                    {option.hint ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)
