import * as React from "react"
import {
  Combobox,
  type ComboboxOption,
} from "@workspace/ui/components/combobox"

/** Event-shaped payload so SelectField drops in where a native <select> was:
 * react-hook-form `register()` and `e.target.value` handlers both work. */
export type SelectFieldChangeEvent = {
  type: "change" | "blur"
  target: { name?: string; value: string }
}

export type SelectFieldHandle = {
  value: string
  name?: string
  focus: () => void
}

export type SelectFieldProps = {
  id?: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (event: SelectFieldChangeEvent) => void
  onBlur?: (event: SelectFieldChangeEvent) => void
  options: ComboboxOption[]
  /** Shown when nothing is selected (the old empty <option>). */
  placeholder?: string
  /** Allow clearing back to "". Default: true when there is a placeholder. */
  clearable?: boolean
  searchable?: boolean
  disabled?: boolean
  className?: string
  "aria-invalid"?: boolean | "true" | "false"
  "aria-describedby"?: string
  "aria-label"?: string
}

/**
 * Native-<select>-compatible wrapper around Combobox (design board 09):
 * same register()/onChange(event) contract, searchable list, "mã · tên".
 */
export const SelectField = React.forwardRef<SelectFieldHandle, SelectFieldProps>(
  function SelectField(
    {
      name,
      value,
      defaultValue,
      onChange,
      onBlur,
      options,
      placeholder,
      clearable,
      "aria-invalid": ariaInvalid,
      ...rest
    },
    ref
  ) {
    const controlled = value !== undefined
    const [inner, setInner] = React.useState(defaultValue ?? "")
    const current = controlled ? value : inner
    const currentRef = React.useRef(current)
    React.useLayoutEffect(() => {
      currentRef.current = current
    }, [current])
    const triggerRef = React.useRef<HTMLButtonElement>(null)

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
        focus: () => triggerRef.current?.focus(),
      }),
      [name]
    )

    return (
      <Combobox
        ref={triggerRef}
        value={current}
        onChange={(next) => {
          if (!controlled) setInner(next)
          currentRef.current = next
          onChange?.({ type: "change", target: { name, value: next } })
        }}
        onBlur={() =>
          onBlur?.({ type: "blur", target: { name, value: currentRef.current } })
        }
        options={options}
        placeholder={placeholder}
        clearable={clearable ?? Boolean(placeholder)}
        aria-invalid={ariaInvalid === true || ariaInvalid === "true"}
        {...rest}
      />
    )
  }
)
