import { APP_TIMEZONE } from "@workspace/format"

export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {}
) {
  if (!date) return ""

  try {
    return new Intl.DateTimeFormat("en-US", {
      // Platform business timezone, not the browser's OS setting.
      timeZone: APP_TIMEZONE,
      month: opts.month ?? "long",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      ...opts,
    }).format(new Date(date))
  } catch (_err) {
    return ""
  }
}
