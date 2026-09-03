import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Cpu } from "lucide-react"
import type { ModelCost } from "../types"

interface CostModelTableProps {
  models: ModelCost[]
}

export function CostModelTable({ models }: CostModelTableProps) {
  const { t, formatNumber } = useI18n()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">
            {t("ai.analytics.model_breakdown.title")}
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          {t("ai.analytics.model_breakdown.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 font-medium">{t("ai.analytics.table.model")}</th>
                <th className="pb-2 font-medium">{t("ai.analytics.table.provider")}</th>
                <th className="pb-2 text-right font-medium">{t("ai.analytics.table.runs")}</th>
                <th className="pb-2 text-right font-medium">{t("ai.analytics.table.tokens")}</th>
                <th className="pb-2 text-right font-medium">{t("ai.analytics.table.cost")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {models.map((m) => (
                <tr key={m.modelId} className="hover:bg-muted/40">
                  <td className="py-2.5 font-mono font-medium">{m.modelId}</td>
                  <td className="py-2.5">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {m.provider}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right font-mono">
                    {formatNumber(m.runs)}
                  </td>
                  <td className="py-2.5 text-right font-mono">
                    {formatNumber(m.tokens)}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-primary">
                    ${m.costUsd.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
