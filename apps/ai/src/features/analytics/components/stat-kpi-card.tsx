import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@workspace/ui/components/card"

interface StatKpiCardProps {
  title: string
  value: string | number
  subtext?: string
  icon: LucideIcon
  trend?: string
  trendPositive?: boolean
}

export function StatKpiCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendPositive,
}: StatKpiCardProps) {
  return (
    <Card className="transition-all hover:border-primary/40 hover:shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <div className="rounded-lg border bg-muted/60 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span
                className={`font-semibold ${
                  trendPositive ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {trend}
              </span>
            )}
            {subtext && <span>{subtext}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
