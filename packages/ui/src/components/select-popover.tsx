import { useState } from "react"
import { Check, PlusCircle, XCircle } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

export function SelectPopover({
  value,
  onChange,
  label,
  options,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  label: string
  options: { label: string; value: string }[]
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const hasValue = Boolean(selected?.value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 gap-1 px-2.5 font-normal",
            !hasValue && "border-dashed text-muted-foreground"
          )}
        >
          {hasValue ? (
            <>
              <span>{label}:</span>
              <Badge
                variant="secondary"
                className="rounded-sm px-1 text-xs font-normal"
              >
                {selected?.label}
              </Badge>
              <div
                role="button"
                aria-label={`Clear ${label} filter`}
                tabIndex={0}
                className="ml-0.5 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(undefined)
                }}
              >
                <XCircle className="size-3.5" />
              </div>
            </>
          ) : (
            <>
              <PlusCircle className="size-3.5" />
              <span>{label}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => {
                    onChange(opt.value || undefined)
                    setOpen(false)
                  }}
                  className="py-1.5 text-sm"
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
