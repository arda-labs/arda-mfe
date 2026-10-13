import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { splitRecipients } from "../format"

type Props = {
  id: string
  label: string
  value: string[]
  onChange: (next: string[]) => void
  placeholder: string
  description?: string
  error?: string
  disabled?: boolean
}

/**
 * Tag input for notification recipients (user ids / group ids / role codes).
 * Deliberately a plain id/code input: the IAM picker lives in apps/workflow
 * and R8 forbids importing it across apps (plan deviation 1).
 */
export function RecipientsInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  error,
  disabled,
}: Props) {
  const { t } = useI18n()
  const [draft, setDraft] = useState("")

  const commit = () => {
    const parts = splitRecipients(draft)
    if (parts.length) onChange(Array.from(new Set([...value, ...parts])))
    setDraft("")
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === ";") {
      event.preventDefault()
      commit()
      return
    }
    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <FormField label={label} htmlFor={id} description={description} error={error}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1" data-testid={`${id}-tags`}>
          {value.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1 pr-1 font-mono text-[11px]">
              {item}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-foreground/10"
                aria-label={t("platform.scheduled_jobs.recipients.remove", { value: item })}
                disabled={disabled}
                onClick={() => onChange(value.filter((existing) => existing !== item))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    </FormField>
  )
}
