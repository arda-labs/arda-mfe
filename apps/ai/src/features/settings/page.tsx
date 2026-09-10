import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Cpu, Gauge, SlidersHorizontal } from "lucide-react"

import { ModelConfigTab } from "./components/model-config-tab"
import { QuotasTab } from "./components/quotas-tab"

export function SettingsPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState("model")

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <PageHeader
        title={t("ai.settings.title")}
        description={t("ai.settings.description")}
        icon={SlidersHorizontal}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="inline-flex h-9 w-fit items-center justify-start gap-1 p-1">
            <TabsTrigger value="model" className="shrink-0 gap-2 px-3 py-1.5 text-xs sm:text-sm">
              <Cpu className="size-3.5 shrink-0" />
              <span>{t("ai.settings.tabs.model")}</span>
            </TabsTrigger>
            <TabsTrigger value="quotas" className="shrink-0 gap-2 px-3 py-1.5 text-xs sm:text-sm">
              <Gauge className="size-3.5 shrink-0" />
              <span>{t("ai.settings.tabs.quotas")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="model" className="m-0">
          <ModelConfigTab />
        </TabsContent>
        <TabsContent value="quotas" className="m-0">
          <QuotasTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
