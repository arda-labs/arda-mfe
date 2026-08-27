import { Download, Music, Video } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

interface MediaViewerProps {
  src: string
  filename: string
  isVideo: boolean
  onDownload?: () => void
  className?: string
}

export function MediaViewer({ src, filename, isVideo, onDownload, className }: MediaViewerProps) {
  return (
    <div className={cn("flex flex-col h-full overflow-hidden border rounded-lg bg-card text-card-foreground", className)}>
      {/* Media Header */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono text-[11px]">
            {isVideo ? <Video className="size-3 text-purple-500" /> : <Music className="size-3 text-amber-500" />}
            {isVideo ? "VIDEO PLAYBACK" : "AUDIO PLAYBACK"}
          </Badge>
          <span className="text-xs text-muted-foreground font-medium truncate max-w-xs">
            {filename}
          </span>
        </div>

        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onDownload}
          >
            <Download className="size-3.5 mr-1" />
            Download
          </Button>
        )}
      </div>

      {/* Media Player Container */}
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/10">
        {isVideo ? (
          <video
            controls
            autoPlay={false}
            src={src}
            className="max-h-[60vh] max-w-full rounded-lg shadow-lg border bg-black"
          >
            Your browser does not support HTML5 video playback.
          </video>
        ) : (
          <div className="flex flex-col items-center gap-4 p-8 rounded-xl border bg-card shadow-sm max-w-md w-full">
            <div className="size-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Music className="size-8" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm truncate max-w-xs">{filename}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Audio stream</p>
            </div>
            <audio controls src={src} className="w-full mt-2">
              Your browser does not support HTML5 audio playback.
            </audio>
          </div>
        )}
      </div>
    </div>
  )
}
