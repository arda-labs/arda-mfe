import { useI18n } from "@workspace/i18n"
import { Card, CardContent } from "@workspace/ui/components/card"
import { ArrowDown, Bot, GitBranch, ShieldCheck } from "lucide-react"
import { ModelConfigTab } from "./model-config-tab"
import { DecisionTab } from "./decision-tab"
import { AgentTab } from "./agent-tab"

const steps = [
  {
    key: "decision",
    icon: GitBranch,
    tone: "text-violet-600 bg-violet-500/10",
  },
  { key: "reasoning", icon: Bot, tone: "text-sky-600 bg-sky-500/10" },
  {
    key: "actions",
    icon: ShieldCheck,
    tone: "text-emerald-600 bg-emerald-500/10",
  },
] as const

export function RuntimeTab() {
  const { t } = useI18n()
  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-2 md:grid-cols-3">
            {steps.map(({ key, icon: Icon, tone }, index) => (
              <div
                key={key}
                className="flex items-center gap-3 rounded-lg border bg-background p-3"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {t(`ai.settings.runtime.${key}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`ai.settings.runtime.${key}_hint`)}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowDown
                    aria-hidden="true"
                    className="ml-auto size-4 text-muted-foreground md:hidden"
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <section aria-labelledby="decision-settings-heading">
        <h2
          id="decision-settings-heading"
          className="mb-2 text-sm font-semibold text-muted-foreground"
        >
          {t("ai.settings.runtime.decision_section")}
        </h2>
        <DecisionTab />
      </section>
      <section aria-labelledby="reasoning-settings-heading">
        <h2
          id="reasoning-settings-heading"
          className="mb-2 text-sm font-semibold text-muted-foreground"
        >
          {t("ai.settings.runtime.reasoning_section")}
        </h2>
        <ModelConfigTab />
      </section>
      <section aria-labelledby="actions-settings-heading">
        <h2
          id="actions-settings-heading"
          className="mb-2 text-sm font-semibold text-muted-foreground"
        >
          {t("ai.settings.runtime.actions_section")}
        </h2>
        <AgentTab />
      </section>
    </div>
  )
}
