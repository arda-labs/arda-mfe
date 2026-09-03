import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Check, Copy, FileText, Hash, Layers } from "lucide-react"
import type { ChunkPreviewOut } from "../api"

export function ChunkPreviewPanel({
  chunks,
  loading = false,
  totalChunks,
}: {
  chunks: ChunkPreviewOut[]
  loading?: boolean
  totalChunks?: number
}) {
  const { t } = useI18n()
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground">
        <Layers className="size-6 animate-pulse" />
        <p className="text-xs">{t("ai.knowledge.preview.loading")}</p>
      </div>
    )
  }

  if (chunks.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground">
        <FileText className="size-6 opacity-40" />
        <p className="text-xs">{t("ai.knowledge.preview.empty")}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <span className="text-xs font-medium">
            {t("ai.knowledge.preview.total_chunks", {
              count: totalChunks ?? chunks.length,
            })}
          </span>
        </div>
        <Badge variant="outline" className="text-[11px]">
          {chunks.length} chunks
        </Badge>
      </div>

      <ScrollArea className="h-64 rounded-md border p-2">
        <div className="space-y-2.5">
          {chunks.map((c) => (
            <div
              key={c.index}
              className="group relative rounded-md border bg-card p-3 text-xs shadow-xs transition-colors hover:border-primary/40"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    <Hash className="mr-0.5 size-2.5" />
                    {c.index + 1}
                  </Badge>
                  {c.heading ? (
                    <Badge variant="outline" className="max-w-[200px] truncate text-[10px]">
                      {c.heading}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{c.word_count} {t("ai.knowledge.preview.words")}</span>
                  <span>•</span>
                  <span>{c.char_count} {t("ai.knowledge.preview.chars")}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-5 opacity-70 group-hover:opacity-100"
                    onClick={() => void handleCopy(c.content, c.index)}
                  >
                    {copiedIndex === c.index ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="line-clamp-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {c.content}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
