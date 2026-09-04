import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import {
  Cpu,
  Gauge,
  GitFork,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"

import { BudgetQuotasTab } from "./components/budget-quotas-tab"
import { GatewayRoutingTab } from "./components/gateway-routing-tab"
import { GuardrailsSafetyTab } from "./components/guardrails-safety-tab"
import { ModelProfilesTab } from "./components/model-profiles-tab"

export function SettingsPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState("profiles")

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
            <TabsTrigger value="profiles" className="shrink-0 gap-2 px-3 py-1.5 text-xs sm:text-sm">
              <Cpu className="size-3.5 shrink-0" />
              <span>{t("ai.settings.tabs.profiles")}</span>
            </TabsTrigger>
            <TabsTrigger value="routing" className="shrink-0 gap-2 px-3 py-1.5 text-xs sm:text-sm">
              <GitFork className="size-3.5 shrink-0" />
              <span>{t("ai.settings.tabs.routing")}</span>
            </TabsTrigger>
            <TabsTrigger value="guardrails" className="shrink-0 gap-2 px-3 py-1.5 text-xs sm:text-sm">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span>{t("ai.settings.tabs.guardrails")}</span>
            </TabsTrigger>
            <TabsTrigger value="quotas" className="shrink-0 gap-2 px-3 py-1.5 text-xs sm:text-sm">
              <Gauge className="size-3.5 shrink-0" />
              <span>{t("ai.settings.tabs.quotas")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profiles" className="m-0">
          <ModelProfilesTab />
        </TabsContent>

        <TabsContent value="routing" className="m-0">
          <GatewayRoutingTab />
        </TabsContent>

        <TabsContent value="guardrails" className="m-0">
          <GuardrailsSafetyTab />
        </TabsContent>

        <TabsContent value="quotas" className="m-0">
          <BudgetQuotasTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
