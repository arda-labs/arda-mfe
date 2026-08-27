import { Download, File, HelpCircle } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import { formatFileSize } from "../file-preview-types"

interface FallbackViewerProps {
  filename: string
  mimeType?: string
  sizeBytes?: number
  onDownload?: () => void
  className?: string
}

export function FallbackViewer({
  filename,
  mimeType,
  sizeBytes,
  onDownload,
  className,
}: FallbackViewerProps) {
  const { t } = useI18n()

  return (
    <div className={cn("flex flex-col items-center justify-center h-full p-8 border rounded-lg bg-card text-card-foreground", className)}>
      <div className="flex flex-col items-center text-center max-w-sm gap-4">
        <div className="size-20 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground shadow-sm">
          <File className="size-10" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-base text-foreground break-all">{filename}</h3>
          <div className="flex items-center justify-center gap-2">
            {mimeType && (
              <Badge variant="secondary" className="text-[11px] font-mono">
                {mimeType}
              </Badge>
            )}
            {sizeBytes ? (
              <span className="text-xs text-muted-foreground font-mono">
                {formatFileSize(sizeBytes)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground text-left border">
          <HelpCircle className="size-4 shrink-0 text-muted-foreground/80" />
          <span>
            {t("preview.unsupported_message")}
          </span>
        </div>

        {onDownload && (
          <Button onClick={onDownload} className="w-full gap-2 mt-2">
            <Download className="size-4" />
            {t("preview.download")}
          </Button>
        )}
      </div>
    </div>
  )
}
