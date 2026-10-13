import { useI18n } from "@workspace/i18n"
import { SelectField } from "@workspace/ui/components/select-field"

const REFRESH_INTERVALS = [0, 5, 10, 30]

export function AutoRefreshSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const { t } = useI18n()
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {t("workflow.operate.auto_refresh")}
      <SelectField
        className="h-8 w-36 text-xs"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        options={REFRESH_INTERVALS.map((seconds) => ({
          value: String(seconds),
          label:
            seconds > 0
              ? t("workflow.operate.auto_refresh_seconds", { seconds })
              : t("workflow.operate.auto_refresh_off"),
        }))}
      />
    </label>
  )
}
