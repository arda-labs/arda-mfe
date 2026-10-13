import { useCallback, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { CalendarClock, Clock3, Moon } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { ScheduledJobsTab } from "../scheduled-jobs"
import { EodTab } from "./components/EodTab"
import { parseJobsTab, type JobsTabKey as TabKey } from "./tabs"

const TABS: ReadonlyArray<{ key: TabKey; icon: typeof Clock3; render: () => ReactNode }> = [
  { key: "scheduled", icon: Clock3, render: () => <ScheduledJobsTab /> },
  { key: "eod", icon: Moon, render: () => <EodTab /> },
]

/** Scheduled jobs (cron engine) + COB/EOD operations on /admin/jobs. */
export function JobsPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseJobsTab(searchParams.get("tab"), searchParams.get("run"))

  const selectTab = useCallback(
    (value: TabKey) => {
      const next = new URLSearchParams(searchParams)
      if (value === "scheduled") next.delete("tab")
      else next.set("tab", value)
      // A run drawer only exists on the scheduled tab.
      if (value !== "scheduled") next.delete("run")
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4 sm:p-6">
      <PageHeader
        title={t("platform.jobs.title")}
        description={t("platform.scheduled_jobs.page_description")}
        icon={CalendarClock}
      />

      <Tabs
        value={tab}
        onValueChange={(value) => selectTab(value as TabKey)}
        className="flex flex-col gap-3"
      >
        <TabsList className="inline-flex h-9 w-fit items-center justify-start gap-1 p-1">
          {TABS.map(({ key, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="shrink-0 gap-2 px-3 py-1.5 text-xs sm:text-sm">
              <Icon className="size-3.5 shrink-0" />
              <span>{t(`platform.scheduled_jobs.tab.${key}`)}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ key, render }) => (
          <TabsContent key={key} value={key} className="m-0">
            {render()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
