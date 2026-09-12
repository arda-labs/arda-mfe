type Translate = (key: string) => string

export function instanceStateLabel(t: Translate, state: string): string {
  switch (state) {
    case "ACTIVE":
      return t("workflow.operate.instance_state_active")
    case "COMPLETED":
      return t("workflow.operate.instance_state_completed")
    case "TERMINATED":
    case "CANCELED":
      return t("workflow.operate.instance_state_canceled")
    case "SUSPENDED":
      return t("workflow.operate.instance_state_suspended")
    default:
      return state
  }
}

export function formatDateTime(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function formatDuration(start?: string, end?: string): string {
  if (!start) return "—"
  const startMs = new Date(start).getTime()
  const endMs = end ? new Date(end).getTime() : Date.now()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return "—"
  const seconds = Math.floor((endMs - startMs) / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function toIsoRange(value?: string, endOfDay = false): string | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}
