/**
 * Re-encode a capture as JPEG ≤ maxSide px. createImageBitmap applies EXIF
 * orientation, so the service receives upright pixels and needs no EXIF
 * handling. Rejects when the browser cannot decode the file (e.g. HEIC on
 * Chrome) — callers show the "unsupported" message.
 */
export async function toJpeg(file: Blob, maxSide = 2000): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("canvas unavailable")
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/jpeg", 0.9)
    )
  } finally {
    bitmap.close()
  }
}
