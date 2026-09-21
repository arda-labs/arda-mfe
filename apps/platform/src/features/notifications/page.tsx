import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Activity,
  Bell,
  LayoutTemplate,
  Mail,
  Server,
  TriangleAlert,
} from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { DlqTab } from "./components/dlq-tab"
import { DesignsTab } from "./components/designs-tab"
import { EventsTab } from "./components/events-tab"
import { SendersTab } from "./components/senders-tab"
import { TemplatesTab } from "./components/templates-tab"

const TABS = [
  { key: "templates", icon: Mail, render: () => <TemplatesTab /> },
  { key: "designs", icon: LayoutTemplate, render: () => <DesignsTab /> },
  { key: "senders", icon: Server, render: () => <SendersTab /> },
  { key: "events", icon: Activity, render: () => <EventsTab /> },
  { key: "dlq", icon: TriangleAlert, render: () => <DlqTab /> },
] as const

type TabKey = (typeof TABS)[number]["key"]

function parseTab(value: string | null): TabKey {
  return TABS.some((entry) => entry.key === value)
    ? (value as TabKey)
    : "templates"
}

/** Notification templates, email designs, mail sender, events and DLQ (X2). */
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
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4 sm:p-6">
      <PageHeader
        title={t("platform.notifications.title")}
        description={t("platform.notifications.description")}
        icon={Bell}
      />

      <Tabs
        value={tab}
        onValueChange={(value) => selectTab(value as TabKey)}
        className="flex flex-col gap-3"
      >
        <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex h-9 w-fit items-center justify-start gap-1 p-1">
              {TABS.map(({ key, icon: Icon }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="shrink-0 gap-2 px-3 py-1.5 text-xs sm:text-sm"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{t(`platform.notifications.tab.${key}`)}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {TABS.map(({ key, render }) => (
          <TabsContent key={key} value={key} className="m-0">
            {render()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
