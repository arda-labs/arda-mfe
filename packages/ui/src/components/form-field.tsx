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
}

function FormField({
  label,
  children,
  className,
  description,
  error,
  htmlFor,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {description && !error ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  )
}

export { FormField }
