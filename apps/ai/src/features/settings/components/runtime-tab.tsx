import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Card, CardContent } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
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

type StepKey = (typeof steps)[number]["key"]

export function RuntimeTab() {
  const { t } = useI18n()
  const [activeStep, setActiveStep] = useState<StepKey>("decision")

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid gap-2 md:grid-cols-3" role="tablist" aria-label={t("ai.settings.tabs.runtime")}>
            {steps.map(({ key, icon: Icon, tone }, index) => {
              const isActive = activeStep === key
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${key}-settings-section`}
                  id={`${key}-step-btn`}
                  onClick={() => setActiveStep(key)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                      : "bg-background hover:bg-muted/50 border-border opacity-80 hover:opacity-100"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg transition-transform",
                      tone,
                      isActive && "scale-105"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>
                      {t(`ai.settings.runtime.${key}`)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t(`ai.settings.runtime.${key}_hint`)}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowDown
                      aria-hidden="true"
                      className="ml-auto size-4 text-muted-foreground md:hidden"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {activeStep === "decision" && (
        <section
          id="decision-settings-section"
          role="tabpanel"
          aria-labelledby="decision-step-btn"
          tabIndex={0}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {t("ai.settings.runtime.decision_section")}
            </h2>
          </div>
          <DecisionTab />
        </section>
      )}

      {activeStep === "reasoning" && (
        <section
          id="reasoning-settings-section"
          role="tabpanel"
          aria-labelledby="reasoning-step-btn"
          tabIndex={0}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {t("ai.settings.runtime.reasoning_section")}
            </h2>
          </div>
          <ModelConfigTab />
        </section>
      )}

      {activeStep === "actions" && (
        <section
          id="actions-settings-section"
          role="tabpanel"
          aria-labelledby="actions-step-btn"
          tabIndex={0}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {t("ai.settings.runtime.actions_section")}
            </h2>
          </div>
          <AgentTab />
        </section>
      )}
    </div>
  )
}
