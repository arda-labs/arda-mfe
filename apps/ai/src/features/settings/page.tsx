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
        <TabsList className="grid w-full grid-cols-2 sm:w-[620px] sm:grid-cols-4">
          <TabsTrigger value="profiles" className="gap-1.5 text-xs">
            <Cpu className="h-3.5 w-3.5" />
            {t("ai.settings.tabs.profiles")}
          </TabsTrigger>
          <TabsTrigger value="routing" className="gap-1.5 text-xs">
            <GitFork className="h-3.5 w-3.5" />
            {t("ai.settings.tabs.routing")}
          </TabsTrigger>
          <TabsTrigger value="guardrails" className="gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("ai.settings.tabs.guardrails")}
          </TabsTrigger>
          <TabsTrigger value="quotas" className="gap-1.5 text-xs">
            <Gauge className="h-3.5 w-3.5" />
            {t("ai.settings.tabs.quotas")}
          </TabsTrigger>
        </TabsList>

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
