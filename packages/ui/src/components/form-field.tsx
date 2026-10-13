import type * as React from "react"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

type FormFieldProps = {
  label: string
  children: React.ReactNode
  className?: string
  description?: React.ReactNode
  error?: React.ReactNode
  htmlFor?: string
  /** Marks the label with "*" (design board 06: required fields are visible
   * up front, not only in the dialog description). */
  required?: boolean
}

function FormField({
  label,
  children,
  className,
  description,
  error,
  htmlFor,
  required,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {description && !error ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  )
}

export { FormField }
