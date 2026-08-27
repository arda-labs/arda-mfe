import * as React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import { detectFileCategory, type FilePreviewSource } from "./file-preview-types"
import { CodeViewer } from "./renderers/code-viewer"
import { CsvViewer } from "./renderers/csv-viewer"
import { PdfViewer } from "./renderers/pdf-viewer"
import { ImageViewer } from "./renderers/image-viewer"
import { MediaViewer } from "./renderers/media-viewer"
import { FallbackViewer } from "./renderers/fallback-viewer"

interface FilePreviewContentProps {
  source: FilePreviewSource
  className?: string
}

export function FilePreviewContent({ source, className }: FilePreviewContentProps) {
  const { src, content, filename, mimeType, sizeBytes, onDownload } = source
  const category = detectFileCategory(filename, mimeType)

  const [loading, setLoading] = React.useState<boolean>(Boolean(src && content === undefined))
  const [error, setError] = React.useState<string | null>(null)
  const [fetchedText, setFetchedText] = React.useState<string | null>(() => {
    if (typeof content === "string") return content
    return null
  })

  const loadTextContent = React.useCallback(async () => {
    if (!src || (category !== "code" && category !== "csv" && category !== "text")) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(src, {
        credentials: "include",
        headers: { Accept: "*/*" },
      })
      if (!response.ok) {
        throw new Error(`Failed to load file content (HTTP ${response.status})`)
      }
      const text = await response.text()
      setFetchedText(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading file content")
    } finally {
      setLoading(false)
    }
  }, [src, category])

  React.useEffect(() => {
    if (content === undefined && src) {
      if (category === "code" || category === "csv" || category === "text") {
        void loadTextContent()
      } else {
        setLoading(false)
      }
    }
  }, [src, content, category, loadTextContent])

  if (loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full min-h-[350px] gap-3", className)}>
        <Spinner className="size-8 text-primary" />
        <p className="text-xs text-muted-foreground font-mono">Đang nạp dữ liệu tệp...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full min-h-[350px] p-6 gap-3 text-center", className)}>
        <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h4 className="font-semibold text-sm">Không thể tải nội dung tệp</h4>
          <p className="text-xs text-muted-foreground break-all">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTextContent} className="gap-1.5 mt-2">
          <RefreshCw className="size-3.5" />
          Thử lại
        </Button>
      </div>
    )
  }

  // 1. Text & Code
  if (category === "code" || category === "text") {
    const textData = fetchedText ?? (typeof content === "string" ? content : "")
    return <CodeViewer content={textData} filename={filename} className={className} />
  }

  // 2. CSV Table
  if (category === "csv") {
    const textData = fetchedText ?? (typeof content === "string" ? content : "")
    return <CsvViewer content={textData} filename={filename} className={className} />
  }

  // 3. PDF
  if (category === "pdf" && src) {
    return <PdfViewer src={src} filename={filename} onDownload={onDownload} className={className} />
  }

  // 4. Image
  if (category === "image" && src) {
    return <ImageViewer src={src} filename={filename} onDownload={onDownload} className={className} />
  }

  // 5. Video & Audio
  if ((category === "video" || category === "audio") && src) {
    return (
      <MediaViewer
        src={src}
        filename={filename}
        isVideo={category === "video"}
        onDownload={onDownload}
        className={className}
      />
    )
  }

  // Fallback
  return (
    <FallbackViewer
      filename={filename}
      mimeType={mimeType}
      sizeBytes={sizeBytes}
      onDownload={onDownload}
      className={className}
    />
  )
}
