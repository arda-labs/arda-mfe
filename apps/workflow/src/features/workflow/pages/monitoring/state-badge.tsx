import { Badge } from "@workspace/ui/components/badge"
import { useI18n } from "@workspace/i18n"
import { instanceStateLabel } from "./format"

export function InstanceStateBadge({ state }: { state: string }) {
  const { t } = useI18n()
  const variant =
    state === "ACTIVE"
      ? "default"
      : state === "COMPLETED"
        ? "secondary"
        : "outline"
  return <Badge variant={variant}>{instanceStateLabel(t, state)}</Badge>
}
