import { useI18n } from "@workspace/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Award, ThumbsUp } from "lucide-react"
import type { FeedbackStats, RAGQualityStats } from "../types"

interface RAGQualityCardProps {
  quality: RAGQualityStats
  feedback: FeedbackStats
}

export function RAGQualityCard({ quality, feedback }: RAGQualityCardProps) {
  const { t } = useI18n()

  const metrics = [
    {
      name: t("ai.analytics.quality.groundedness"),
      score: quality.groundednessScore * 100,
      description: t("ai.analytics.quality.groundedness_desc"),
    },
    {
      name: t("ai.analytics.quality.faithfulness"),
      score: quality.faithfulnessScore * 100,
      description: t("ai.analytics.quality.faithfulness_desc"),
    },
    {
      name: t("ai.analytics.quality.retrieval_precision"),
      score: quality.retrievalPrecision * 100,
      description: t("ai.analytics.quality.retrieval_precision_desc"),
    },
    {
      name: t("ai.analytics.quality.user_satisfaction"),
      score: feedback.satisfactionRate,
      description: `${feedback.positive} 👍 / ${feedback.negative} 👎 (${feedback.total} ratings)`,
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">
            {t("ai.analytics.quality.title")}
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          {t("ai.analytics.quality.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5 pt-0">
        {metrics.map((m) => (
          <div key={m.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{m.name}</span>
              <span className="font-mono font-semibold text-primary">
                {m.score.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(m.score, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{m.description}</p>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5 text-xs">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t("ai.analytics.feedback.rate_label")}</span>
          </div>
          <span className="font-bold text-emerald-500">
            {feedback.satisfactionRate.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
