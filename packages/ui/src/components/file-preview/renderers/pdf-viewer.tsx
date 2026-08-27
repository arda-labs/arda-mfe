import { Download, ExternalLink, FileText, Printer } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

interface PdfViewerProps {
  src: string
  filename: string
  onDownload?: () => void
  className?: string
}

export function PdfViewer({ src, filename, onDownload, className }: PdfViewerProps) {
  const { t } = useI18n()

  const handleOpenNewTab = () => {
    window.open(src, "_blank", "noopener,noreferrer")
  }

  const handlePrint = () => {
    const iframe = document.getElementById("pdf-preview-frame") as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print()
    } else {
      window.open(src, "_blank")
    }
  }

  return (
    <div className={cn("flex flex-col h-full overflow-hidden border rounded-lg bg-card text-card-foreground", className)}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono text-[11px]">
            <FileText className="size-3 text-red-500" />
            PDF DOCUMENT
          </Badge>
          <span className="text-xs text-muted-foreground font-medium truncate max-w-xs">
            {filename}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handlePrint}
            title="In tài liệu (Print)"
          >
            <Printer className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleOpenNewTab}
            title={t("preview.open_new_tab")}
          >
            <ExternalLink className="size-3.5" />
          </Button>

          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onDownload}
            >
              <Download className="size-3.5 mr-1" />
              {t("preview.download")}
            </Button>
          )}
        </div>
      </div>

      {/* PDF Iframe */}
      <div className="flex-1 w-full h-full bg-muted/20">
        <iframe
          id="pdf-preview-frame"
          src={`${src}#toolbar=1&navpanes=1`}
          title={filename}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  )
}
