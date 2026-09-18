import * as React from "react"
import type { FilePreviewSource } from "./file-preview-types"

export type BlobPreviewOptions = Omit<FilePreviewSource, "src" | "content">

/**
 * Owns the object-URL lifecycle for previews whose bytes are fetched on demand.
 * Private media must be loaded through the credentialed API client (session
 * cookie + `X-Org-Id`) because browser navigation cannot attach that header;
 * the hook turns the resulting blob into a `FilePreviewSource` and revokes the
 * URL whenever the source is replaced or the component unmounts.
 */
export function useBlobPreview() {
  const [source, setSource] = React.useState<FilePreviewSource | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const blobUrl = source?.src?.startsWith("blob:") ? source.src : null
    if (!blobUrl) return
    return () => URL.revokeObjectURL(blobUrl)
  }, [source])

  /** Shows a source that is already in memory (external URL or file card). */
  const show = React.useCallback((next: FilePreviewSource | null) => {
    setSource(next)
  }, [])

  const openWithBlob = React.useCallback(
    async (load: () => Promise<Blob>, options: BlobPreviewOptions) => {
      setLoading(true)
      try {
        const blob = await load()
        setSource({ ...options, src: URL.createObjectURL(blob) })
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const close = React.useCallback(() => setSource(null), [])

  return { source, loading, show, openWithBlob, close }
}
