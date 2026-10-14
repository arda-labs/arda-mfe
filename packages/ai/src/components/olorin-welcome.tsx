import type { ComponentType } from "react"
import { ThreadPrimitive } from "@assistant-ui/react"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import {
  BellRing,
  BookOpen,
  ChartColumn,
  FileChartColumn,
  SlidersHorizontal,
  Sparkles,
  Table2,
} from "lucide-react"

// One starter per kind of answer Olorin can give, so a new user sees the whole
// range: cited knowledge, a catalogued report, an ad-hoc chart, a table, a
// what-if widget, and monitoring. Each prompt names its target concretely
// (report, period, parameters) so it runs without a clarifying question.
// Keys map to ai.starters.<key>.{kind,prompt}.
const STARTERS: ReadonlyArray<{ key: string; icon: ComponentType<{ className?: string }> }> = [
  { key: "knowledge", icon: BookOpen },
  { key: "report", icon: FileChartColumn },
  { key: "chart", icon: ChartColumn },
  { key: "table", icon: Table2 },
  { key: "simulation", icon: SlidersHorizontal },
  { key: "alerts", icon: BellRing },
]

export function OlorinWelcome({ wide = false, composer }: { wide?: boolean; composer: React.ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="@container flex flex-1 flex-col items-center justify-center px-6 py-10 text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
      <div className="relative mb-4">
        <div
          className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-2xl motion-safe:animate-pulse"
          aria-hidden="true"
        />
        <div className="flex size-14 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 via-primary/10 to-brand-accent/10 text-primary shadow-xs ring-1 ring-primary/20 motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-300">
          <Sparkles className="size-7" />
        </div>
      </div>
      <p className="text-xl font-semibold tracking-tight">{t("ai.empty.title")}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{t("ai.empty.hint")}</p>

      <div
        className={cn(
          "mt-6 w-full text-left transition-[max-width] duration-300",
          wide ? "max-w-none" : "max-w-3xl"
        )}
      >
        {composer}
      </div>

      <div className="mt-6 w-full max-w-3xl text-left">
        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">{t("ai.starters.heading")}</p>
        <div className="grid grid-cols-1 gap-2 @lg:grid-cols-2">
          {STARTERS.map(({ key, icon: Icon }, index) => (
            <ThreadPrimitive.Suggestion
              key={key}
              prompt={t(`ai.starters.${key}.prompt`)}
              method="replace"
              autoSend
              asChild
            >
              {/* The card shows a short label; the full prompt is what gets sent,
                  and it is the tooltip so the user can read it first. */}
              <button
                type="button"
                data-testid={`olorin-starter-${key}`}
                title={t(`ai.starters.${key}.prompt`)}
                className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card px-2.5 py-2 text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-reduce:hover:translate-y-0"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium text-muted-foreground">
                    {t(`ai.starters.${key}.kind`)}
                  </span>
                  <span className="block truncate text-[13px] leading-snug text-foreground">
                    {t(`ai.starters.${key}.label`)}
                  </span>
                </span>
              </button>
            </ThreadPrimitive.Suggestion>
          ))}
        </div>
        <div className="mt-3 text-center">
          <ThreadPrimitive.Suggestion prompt={t("ai.starters.capabilities")} method="replace" autoSend asChild>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("ai.starters.capabilities")}
            </button>
          </ThreadPrimitive.Suggestion>
        </div>
      </div>
    </div>
  )
}
