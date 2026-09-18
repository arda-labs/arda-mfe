import { File, HelpCircle } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { formatFileSize } from "../file-preview-types"

interface FallbackViewerProps {
  filename: string
  mimeType?: string
  sizeBytes?: number
  className?: string
}

export function FallbackViewer({
  filename,
  mimeType,
  sizeBytes,
  className,
}: FallbackViewerProps) {
  const { t } = useI18n()

  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center rounded-lg border bg-card p-8 text-card-foreground",
        className
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground shadow-sm">
          <File className="size-10" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold break-all text-foreground">
            {filename}
          </h3>
          <div className="flex items-center justify-center gap-2">
            {mimeType && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {mimeType}
              </Badge>
            )}
            {sizeBytes ? (
              <span className="font-mono text-xs text-muted-foreground">
                {formatFileSize(sizeBytes)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-left text-xs text-muted-foreground">
          <HelpCircle className="size-4 shrink-0 text-muted-foreground/80" />
          <span>{t("preview.unsupported_message")}</span>
        </div>
      </div>
    </div>
  )
}
