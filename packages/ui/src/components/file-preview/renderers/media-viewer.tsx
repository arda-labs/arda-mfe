import { Music } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

interface MediaViewerProps {
  src: string
  filename: string
  isVideo: boolean
  className?: string
}

export function MediaViewer({
  src,
  filename,
  isVideo,
  className,
}: MediaViewerProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground",
        className
      )}
    >
      {/* File actions live in the preview header; players keep native controls. */}
      <div className="flex flex-1 items-center justify-center bg-muted/10 p-6">
        {isVideo ? (
          <video
            controls
            autoPlay={false}
            src={src}
            className="max-h-[60vh] max-w-full rounded-lg border bg-black shadow-lg"
          >
            Your browser does not support HTML5 video playback.
          </video>
        ) : (
          <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-8 shadow-sm">
            <div className="flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Music className="size-8" />
            </div>
            <div className="text-center">
              <p className="max-w-xs truncate text-sm font-semibold">
                {filename}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Audio stream
              </p>
            </div>
            <audio controls src={src} className="mt-2 w-full">
              Your browser does not support HTML5 audio playback.
            </audio>
          </div>
        )}
      </div>
    </div>
  )
}
