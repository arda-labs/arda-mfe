import { useI18n } from "@workspace/i18n"

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
      <select
        className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        <option value={0}>{t("workflow.operate.auto_refresh_off")}</option>
        {REFRESH_INTERVALS.filter((seconds) => seconds > 0).map((seconds) => (
          <option key={seconds} value={seconds}>
            {t("workflow.operate.auto_refresh_seconds", { seconds })}
          </option>
        ))}
      </select>
    </label>
  )
}
