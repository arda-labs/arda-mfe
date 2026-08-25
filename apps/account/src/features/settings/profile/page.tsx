import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { api, type ApiSuccess } from "@workspace/api"
import { uploadAvatar } from "@workspace/media"
import type { LucideIcon } from "lucide-react"
import {
  BadgeCheck,
  Camera,
  Copy,
  Mail,
  ShieldCheck,
  Upload,
  User2,
} from "lucide-react"
import { useAuthStore } from "@workspace/auth/store"
import { translateApiError, useI18n } from "@workspace/i18n"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"

export function ProfilePage() {
  const { t } = useI18n()
  const { user, updateUser } = useAuthStore()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState(user?.picture || "")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [updatingEmail, setUpdatingEmail] = useState(false)

  useEffect(() => {
    setPreview(user?.picture || "")
  }, [user?.picture])

  const initials = useMemo(() => {
    const source = user?.name || user?.email || "?"
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [user])

  const publicProfilePath = `/in/${user?.username || (user?.email ? user.email.split("@")[0] : "me")}`

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setError(null)
    setMessage(null)

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
    setUploadingAvatar(true)
    try {
      const result = await uploadAvatar(file, user.userId || user.sub)
      updateUser({ picture: result.url, avatarFileId: result.public_id })
      setPreview(result.url)
      setMessage(t("profile.avatar.upload_success"))
    } catch (err) {
      setPreview(user.picture || "")
      setError(translateApiError(err, "profile.avatar.upload_failed"))
    } finally {
      setUploadingAvatar(false)
      URL.revokeObjectURL(localPreview)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const handleChangeEmail = async () => {
    const email = newEmail.trim()
    if (!email) {
      setEmailError("Email is required")
      return
    }

    setEmailError(null)
    setUpdatingEmail(true)
    try {
      const response = await api.put<ApiSuccess<{ email: string }>>(
        "/api/identity/me/email",
        { email }
      )
      const updated = response.result
      updateUser({ email: updated.email })
      setMessage("Email updated")
      setEmailOpen(false)
      setNewEmail("")
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : "Failed to update email"
      )
    } finally {
      setUpdatingEmail(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-lg border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {t("profile.title")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("profile.description")}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={publicProfilePath}>Open public profile</a>
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ReadOnlyField
            label={t("common.field.name")}
            value={user?.name || ""}
            icon={User2}
          />
          <div className="min-w-0">
            <Label className="text-xs font-medium text-muted-foreground">
              {t("common.field.email")}
            </Label>
            <div className="mt-1.5 flex min-w-0 gap-2">
              <div className="relative min-w-0 flex-1">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={user?.email || ""} readOnly className="pl-10" />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailOpen(true)}
              >
                Change
              </Button>
            </div>
          </div>
          <ReadOnlyField
            label={t("profile.field.user_id")}
            value={user?.userId || ""}
            icon={BadgeCheck}
          />
          <ReadOnlyField
            label={t("profile.field.subject")}
            value={user?.sub || ""}
            icon={ShieldCheck}
          />
          <ReadOnlyField
            label={t("profile.field.avatar_file_id")}
            value={user?.avatarFileId || ""}
            copyable
          />
          <ReadOnlyField
            label={t("profile.field.avatar_url")}
            value={user?.picture || ""}
            copyable
          />
          <ReadOnlyField
            label="Cover file ID"
            value={user?.coverFileId || ""}
            copyable
          />
          <ReadOnlyField
            label="Cover image URL"
            value={user?.coverImage || ""}
            copyable
          />
        </div>

        {message && (
          <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </section>

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
          disabled={uploadingAvatar}
        >
          {uploadingAvatar ? (
            <Spinner className="size-4" />
          ) : (
            <Upload className="size-4" />
          )}
          {uploadingAvatar
            ? t("profile.avatar.uploading")
            : t("profile.avatar.upload")}
        </Button>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {t("profile.avatar.hint")}
        </p>
      </aside>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change email address</DialogTitle>
            <DialogDescription>
              Use an email address you can access for security notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label
              htmlFor="new-email"
              className="text-xs font-medium text-muted-foreground"
            >
              New email
            </Label>
            <Input
              id="new-email"
              type="email"
              placeholder="email@example.com"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
            {emailError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {emailError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              {t("common.action.cancel")}
            </Button>
            <Button onClick={handleChangeEmail} disabled={updatingEmail}>
              {updatingEmail ? <Spinner className="mr-2 size-4" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
  icon: Icon,
  copyable,
}: {
  label: string
  value: string
  icon?: LucideIcon
  copyable?: boolean
}) {
  const copy = () => {
    if (value) void navigator.clipboard.writeText(value)
  }

  return (
    <div className="min-w-0">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative mt-1.5 flex items-center">
        {Icon && (
          <Icon className="absolute left-3 size-4 text-muted-foreground" />
        )}
        <Input
          value={value}
          readOnly
          className={Icon ? "truncate pr-10 pl-10" : "truncate pr-10"}
        />
        {copyable && value ? (
          <button
            type="button"
            onClick={copy}
            className="absolute right-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Copy"
          >
            <Copy className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
