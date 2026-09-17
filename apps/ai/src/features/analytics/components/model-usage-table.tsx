import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Cpu } from "lucide-react"
import type { ModelUsage } from "../types"

interface ModelUsageTableProps {
  models: ModelUsage[]
}

export function ModelUsageTable({ models }: ModelUsageTableProps) {
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
        <Table className="text-left text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="h-auto pb-2">{t("ai.analytics.table.model")}</TableHead>
              <TableHead className="h-auto pb-2">{t("ai.analytics.table.provider")}</TableHead>
              <TableHead className="h-auto pb-2 text-right">{t("ai.analytics.table.runs")}</TableHead>
              <TableHead className="h-auto pb-2 text-right">{t("ai.analytics.table.tokens")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((m) => (
              <TableRow key={m.modelId} className="hover:bg-muted/40">
                <TableCell className="py-2.5 font-mono font-medium">{m.modelId}</TableCell>
                <TableCell className="py-2.5">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {m.provider}
                  </Badge>
                </TableCell>
                <TableCell className="py-2.5 text-right font-mono">
                  {formatNumber(m.runs)}
                </TableCell>
                <TableCell className="py-2.5 text-right font-mono">
                  {formatNumber(m.tokens)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
