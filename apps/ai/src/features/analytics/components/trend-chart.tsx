import { useI18n } from "@workspace/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { TrendingUp } from "lucide-react"
import type { DayTrend } from "../types"

interface TrendChartProps {
  data: DayTrend[]
}

export function TrendChart({ data }: TrendChartProps) {
  const { t, formatNumber } = useI18n()

  const maxRuns = Math.max(...data.map((d) => d.runs), 1)

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              {t("ai.analytics.trend.title")}
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {t("ai.analytics.trend.subtitle")}
          </span>
        </div>
        <CardDescription className="text-xs">
          {t("ai.analytics.trend.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex h-48 items-end gap-2 sm:gap-4">
          {data.map((d) => {
            const heightPercent = Math.max(Math.round((d.runs / maxRuns) * 100), 8)
            const dateShort = d.date.slice(5) // MM-DD

            return (
              <div
                key={d.date}
                className="group flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="relative flex h-36 w-full items-end justify-center rounded-md bg-muted/40 p-1">
                  <div
                    className="w-full rounded-sm bg-primary/80 transition-all duration-300 group-hover:bg-primary"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <div className="absolute -top-7 hidden rounded bg-popover px-1.5 py-0.5 text-[10px] font-medium text-popover-foreground shadow-xs group-hover:block">
                    {d.runs} runs • {formatNumber(d.tokens)} tok
                  </div>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {dateShort}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
