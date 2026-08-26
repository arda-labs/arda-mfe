import { useI18n } from "@workspace/i18n"
import {
  OlorinPanel,
  OlorinProvider,
  olorinFixtures,
} from "@workspace/ai"

function useFixtureKey(): string | undefined {
  if (typeof window === "undefined") return undefined
  return new URLSearchParams(window.location.search).get("olorin-fixture") ?? undefined
}

export function OlorinPage() {
  const { t } = useI18n()
  const fixtureKey = useFixtureKey()

  return (
    <section className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="space-y-1 border-b p-4">
          <p className="text-sm font-semibold">
            {t("ai.name")} · {t("ai.tagline")}
          </p>
          <p className="text-xs text-muted-foreground">{t("ai.empty.hint")}</p>
        </div>
        <OlorinProvider>
          <OlorinPanel
            className="min-h-0 flex-1"
            fixtureKey={fixtureKey && olorinFixtures[fixtureKey] ? fixtureKey : undefined}
          />
        </OlorinProvider>
      </div>
    </section>
  )
}
