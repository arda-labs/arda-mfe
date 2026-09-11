import { useCallback, useEffect, useState } from "react"
import Cropper from "react-easy-crop"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

/**
 * Shared crop-before-upload dialog (react-easy-crop). The user frames the
 * image against a fixed aspect ratio, the confirmed region is re-encoded to
 * JPEG through canvas and handed back as a File for the normal upload path.
 * Output is flattened to JPEG (white background for PNG/WebP alpha) so
 * avatar/cover uploads stay small.
 *
 * Used by account profile (avatar 1:1, cover 16:9), CRM customer avatar and
 * HRM employee avatar uploaders. The dialog title is caller-supplied; the
 * generic labels come from the shared `crop.*` keys.
 */
export function ImageCropDialog({
  file,
  aspect,
  title,
  onConfirm,
  onClose,
  processing,
}: {
  file: File | null
  aspect: number
  title: string
  onConfirm: (cropped: File) => void
  onClose: () => void
  processing: boolean
}) {
  const { t } = useI18n()
  const [imageUrl, setImageUrl] = useState("")
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    if (!file) {
      setImageUrl("")
      return
    }
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback(
    (_: unknown, area: { x: number; y: number; width: number; height: number }) => {
      setCroppedAreaPixels(area)
    },
    []
  )

  async function confirm() {
    if (!file || !croppedAreaPixels) return
    const blob = await cropToBlob(imageUrl, croppedAreaPixels)
    if (!blob) {
      onClose()
      return
    }
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    onConfirm(new File([blob], name, { type: "image/jpeg" }))
  }

  return (
    <Dialog
      open={Boolean(file)}
      onOpenChange={(open) => {
        if (!open && !processing) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
          {imageUrl ? (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : null}
        </div>
        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          {t("crop.zoom")}
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="flex-1"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={onClose}
          >
            {t("crop.cancel")}
          </Button>
          <Button type="button" disabled={processing} onClick={() => void confirm()}>
            {t("crop.apply")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

async function cropToBlob(
  imageUrl: string,
  area: { x: number; y: number; width: number; height: number }
): Promise<Blob | null> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(area.width)
  canvas.height = Math.round(area.height)
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height
  )
  return await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9)
  )
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("failed to load image"))
    image.src = url
  })
}
