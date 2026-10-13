import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export type Choice<T extends string> = {
  value: T
  label: string
  description?: string
  preview?: ReactNode
}

/** A radio group drawn as cards; one section of the appearance page. */
export function ChoiceGroup<T extends string>({
  title,
  description,
  value,
  choices,
  onChange,
  columns = 3,
}: {
  title: string
  description: string
  value: T
  choices: Choice<T>[]
  onChange: (value: T) => void
  columns?: 2 | 3
}) {
  return (
    <section className="grid gap-4 border-b py-6 last:border-b-0 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div
        role="radiogroup"
        aria-label={title}
        className={cn(
          "grid gap-3",
          columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
        )}
      >
        {choices.map((choice) => {
          const selected = choice.value === value
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(choice.value)}
              className={cn(
                "relative flex flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50",
                selected && "border-primary ring-2 ring-primary/20"
              )}
            >
              {choice.preview}
              <span className="flex items-center gap-2 text-sm font-medium">
                {choice.label}
                {selected ? (
                  <Check className="ml-auto size-4 text-primary" aria-hidden />
                ) : null}
              </span>
              {choice.description ? (
                <span className="text-xs text-muted-foreground">
                  {choice.description}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
