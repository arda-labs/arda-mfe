import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { uploadAvatar } from "@workspace/media"
import { Camera, Upload } from "lucide-react"
import { useAuthStore } from "@workspace/auth/store"
import { translateApiError, useI18n } from "@workspace/i18n"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

export function AvatarCard() {
  const { t } = useI18n()
  const { user, updateUser } = useAuthStore()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState(user?.picture || "")
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setPreview(user?.picture || "")
  }, [user?.picture])

  const initials = (() => {
    const source = user?.name || user?.email || "?"
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  })()

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setError(null)

    if (!file.type.startsWith("image/")) {
      setError(t("profile.avatar.invalid_type"))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t("profile.avatar.too_large"))
      return
    }

    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)
    setUploading(true)
    try {
      const result = await uploadAvatar(file, user.userId || user.sub)
      updateUser({ picture: result.url, avatarFileId: result.public_id })
      setPreview(result.url)
    } catch (err) {
      setPreview(user.picture || "")
      setError(translateApiError(err, "profile.avatar.upload_failed"))
    } finally {
      setUploading(false)
      URL.revokeObjectURL(localPreview)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <aside className="rounded-lg border bg-card p-5 md:p-6">
      <h2 className="text-base font-semibold">{t("profile.avatar.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("profile.avatar.description")}
      </p>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="size-32">
            <AvatarImage
              src={preview}
              alt={user?.name || user?.email || "User"}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-3xl font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute right-1 bottom-1 rounded-full bg-primary p-2 text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Camera className="size-4" />
          </button>
        </div>
        <Badge variant={preview ? "secondary" : "outline"}>
          {preview
            ? t("profile.avatar.status_uploaded")
            : t("profile.avatar.status_empty")}
        </Badge>
        {error && (
          <p className="text-center text-xs text-destructive">{error}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        className="mt-6 w-full gap-2"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Spinner className="size-4" /> : <Upload className="size-4" />}
        {uploading ? t("profile.avatar.uploading") : t("profile.avatar.upload")}
      </Button>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {t("profile.avatar.hint")}
      </p>
    </aside>
  )
}
