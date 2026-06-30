import type * as React from "react"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

type FormFieldProps = {
  label: string
  children: React.ReactNode
  className?: string
}

function FormField({ label, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export { FormField }
