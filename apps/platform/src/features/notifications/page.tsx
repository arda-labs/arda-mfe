import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { DlqTab } from "./components/dlq-tab"
import { EventsTab } from "./components/events-tab"
import { SendersTab } from "./components/senders-tab"
import { TemplatesTab } from "./components/templates-tab"

const TAB_KEYS = ["templates", "senders", "events", "dlq"] as const
type TabKey = (typeof TAB_KEYS)[number]

function parseTab(value: string | null): TabKey {
  return TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : "templates"
}

/** Notification templates + mail sender config (X2). */
export function NotificationsAdminPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get("tab"))

  const selectTab = useCallback(
    (value: TabKey) => {
      const next = new URLSearchParams(searchParams)
      if (value === "templates") next.delete("tab")
      else next.set("tab", value)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">
          {t("platform.notifications.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("platform.notifications.description")}
        </p>
      </div>

      <div className="flex gap-2">
        {TAB_KEYS.map((value) => (
          <button
            key={value}
            type="button"
            className={
              value === tab
                ? "rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                : "rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/60"
            }
            onClick={() => selectTab(value)}
          >
            {t(`platform.notifications.tab.${value}`)}
          </button>
        ))}
      </div>

      {tab === "templates" && <TemplatesTab />}
      {tab === "senders" && <SendersTab />}
      {tab === "events" && <EventsTab />}
      {tab === "dlq" && <DlqTab />}
    </div>
  )
}
