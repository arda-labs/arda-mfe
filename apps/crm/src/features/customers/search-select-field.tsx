import { useState } from "react"
import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { Controller } from "react-hook-form"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { FormField } from "@workspace/ui/components/form-field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

export type SearchSelectOption = {
  value: string
  label: string
  description?: string
}

type SearchSelectFieldProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  emptyLabel?: string
  options: SearchSelectOption[]
  disabled?: boolean
  loading?: boolean
  error?: string
}

export function SearchSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Chọn giá trị",
  emptyLabel = "Không chọn",
  options,
  disabled,
  loading,
  error,
}: SearchSelectFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selected = options.find((option) => option.value === field.value)

        return (
          <FormField label={label} error={error}>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={disabled || loading}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {loading
                      ? "Đang tải..."
                      : selected?.label || field.value || placeholder}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Tìm theo mã hoặc tên" />
                  <CommandList>
                    <CommandEmpty>Không có dữ liệu phù hợp.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__empty__"
                        onSelect={() => {
                          field.onChange("")
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            field.value === "" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {emptyLabel}
                      </CommandItem>
                      {options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={`${option.value} ${option.label} ${option.description ?? ""}`}
                          onSelect={() => {
                            field.onChange(option.value)
                            setOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              "size-4",
                              field.value === option.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="truncate">{option.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormField>
        )
      }}
    />
  )
}

export function toGeoOptions(
  items: Array<{ code: string; name: string }>
): SearchSelectOption[] {
  return items.map((item) => ({
    value: item.code,
    label: `${item.code} — ${item.name}`,
  }))
}
