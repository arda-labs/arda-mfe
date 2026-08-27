"use client"

import type { Column } from "@tanstack/react-table"
import { Check, PlusCircle, XCircle } from "lucide-react"
import * as React from "react"

import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import type { Option } from "@workspace/ui/types/data-table"

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options: Option[]
  multiple?: boolean
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  multiple,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)

  const columnFilterValue = column?.getFilterValue()
  const selectedValues = new Set(
    Array.isArray(columnFilterValue) ? columnFilterValue : []
  )

  const onItemSelect = React.useCallback(
    (option: Option, isSelected: boolean) => {
      if (!column) return

      if (multiple) {
        const newSelectedValues = new Set(selectedValues)
        if (isSelected) {
          newSelectedValues.delete(option.value)
        } else {
          newSelectedValues.add(option.value)
        }
        const filterValues = Array.from(newSelectedValues)
        column.setFilterValue(filterValues.length ? filterValues : undefined)
      } else {
        column.setFilterValue(isSelected ? undefined : [option.value])
        setOpen(false)
      }
    },
    [column, multiple, selectedValues]
  )

  const onReset = React.useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation()
      column?.setFilterValue(undefined)
    },
    [column]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={selectedValues.size > 0 ? "outline" : "outline"}
          className={cn(
            "h-8 px-3 font-normal",
            selectedValues.size > 0
              ? "text-foreground"
              : "border-dashed text-muted-foreground"
          )}
        >
          {selectedValues.size > 0 ? (
            <span className="flex items-center gap-1">
              <span>{title}:</span>
              {selectedValues.size > 2 ? (
                <Badge className="rounded-sm border-primary/20 bg-primary/10 px-1 text-xs font-normal text-primary">
                  {t("table.selected_count", { count: selectedValues.size }) ||
                    `${selectedValues.size} đã chọn`}
                </Badge>
              ) : (
                options
                  .filter((option) => selectedValues.has(option.value))
                  .map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.value}
                      className="rounded-sm px-1.5 text-xs font-normal"
                    >
                      {option.label}
                    </Badge>
                  ))
              )}
              <div
                role="button"
                aria-label={t("action.clear_filters") || `Clear ${title} filter`}
                tabIndex={0}
                className="ml-0.5 rounded-sm opacity-60 transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                onClick={onReset}
              >
                <XCircle className="size-3.5" />
              </div>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <PlusCircle className="size-3.5" />
              <span>{title}</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-50 p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="max-h-full">
            <CommandEmpty>
              {t("table.no_results") || "No results found."}
            </CommandEmpty>
            <CommandGroup className="max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)

                return (
                  <CommandItem
                    key={option.value}
                    className="[&>svg:last-child]:hidden"
                    onSelect={() => onItemSelect(option, isSelected)}
                  >
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check />
                    </div>
                    {option.icon && <option.icon />}
                    <span className="truncate">{option.label}</span>
                    {option.count && (
                      <span className="ml-auto font-mono text-xs">
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onReset()}
                    className="justify-center text-center"
                  >
                    {t("action.clear_filters") || "Clear filters"}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
