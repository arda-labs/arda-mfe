import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, Upload, ShieldCheck, Mail, User2, BadgeCheck } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@workspace/ui/components/dialog"
import { uploadAvatar } from "@workspace/media"
import { useAuthStore } from "@workspace/auth"
import { translateApiError, useI18n } from "@workspace/i18n"

export function ProfilePage() {
  const { t } = useI18n()
  const { user, updateUser } = useAuthStore()
  const userUsername = user?.username || (user?.email ? user.email.split("@")[0] : "me")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState(user?.picture || "")
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [emailOpen, setEmailOpen] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [isSavingEmail, setIsSavingEmail] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      setErrorMsg("Email is required")
      return
    }
    setErrorMsg(null)
    setIsSavingEmail(true)
    try {
      const res = await fetch("/api/identity/me/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update email")
      }
      const updatedCtx = await res.json()
      updateUser({ email: updatedCtx.email })
      setMessage("Email updated successfully!")
      setEmailOpen(false)
      setNewEmail("")
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update email")
    } finally {
      setIsSavingEmail(false)
    }
  }

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

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
    setIsUploading(true)
    try {
      const result = await uploadAvatar(file, user.userId || user.sub)
      const contentURL = result.url
      updateUser({ picture: contentURL, avatarFileId: result.public_id })
      setPreview(contentURL)
      setMessage(t("profile.avatar.upload_success"))
    } catch (err) {
      setPreview(user.picture || "")
      setError(translateApiError(err, "profile.avatar.upload_failed"))
    } finally {
      setIsUploading(false)
      URL.revokeObjectURL(localPreview)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Card className="border-none bg-transparent shadow-none">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl font-bold tracking-tight">{t("profile.title")}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t("profile.description")}</CardDescription>
          </CardHeader>
          <CardContent className="px-0 space-y-6">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-600 dark:text-blue-400 flex flex-col gap-2">
              <p className="font-semibold">Thông tin tài khoản hệ thống</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Các thông tin định danh và liên hệ cá nhân đã được chuyển sang quản lý trực tiếp tại trang hồ sơ.
                Bạn có thể cập nhật ảnh đại diện, ảnh bìa và thông tin cá nhân của mình tại <a href={`/in/${userUsername}`} className="underline font-medium text-blue-600 dark:text-blue-400">Trang cá nhân của bạn</a>.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField
                label={t("common.field.name")}
                value={user?.name || ""}
                icon={User2}
              />
              <div className="space-y-1.5 group">
                <Label className="text-xs font-semibold text-muted-foreground/80 group-focus-within:text-primary transition-colors">{t("common.field.email")}</Label>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <Mail className="absolute left-3.5 size-4 text-muted-foreground/60" />
                    <Input 
                      value={user?.email || ""} 
                      readOnly 
                      className="bg-muted/20 border-muted-foreground/10 rounded-xl py-5 font-medium focus-visible:ring-1 focus-visible:ring-primary/20 pl-11" 
                    />
                  </div>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setEmailOpen(true)}
                    className="h-10 rounded-xl border border-input bg-background text-xs font-semibold hover:bg-accent cursor-pointer"
                  >
                    Thay đổi
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
              />
              <ReadOnlyField
                label={t("profile.field.avatar_url")}
                value={user?.picture || ""}
              />
              <ReadOnlyField
                label="Cover File ID"
                value={user?.coverFileId || ""}
              />
              <ReadOnlyField
                label="Cover Image URL"
                value={user?.coverImage || ""}
              />
            </div>

            {message && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="bg-muted/30 border-muted/50 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t("profile.avatar.title")}</CardTitle>
            <CardDescription className="text-xs">{t("profile.avatar.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="size-32 ring-4 ring-background shadow-lg transition-transform duration-300 group-hover:scale-105">
                  <AvatarImage
                    src={preview}
                    alt={user?.name || user?.email || "User"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-3xl font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button 
                  type="button" 
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full shadow-md hover:bg-primary/90 transition-transform duration-300 hover:scale-110"
                >
                  <Camera className="size-4" />
                </button>
              </div>
              <Badge variant={preview ? "secondary" : "outline"} className="rounded-full px-3 py-0.5">
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
              className="w-full rounded-xl py-5 shadow-sm"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  {t("profile.avatar.uploading")}
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" />
                  {t("profile.avatar.upload")}
                </>
              )}
            </Button>
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground leading-normal">
              <Camera className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
              <p>{t("profile.avatar.hint")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Email Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thay đổi địa chỉ Email</DialogTitle>
            <DialogDescription>
              Nhập địa chỉ email mới bên dưới. Thay đổi này sẽ cập nhật trên hệ thống bảo mật.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-email" className="text-xs font-semibold">Email mới</Label>
              <Input
                id="new-email"
                type="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            {errorMsg && (
              <div className="text-xs text-destructive bg-destructive/5 border border-destructive/10 px-3 py-2 rounded-lg">
                {errorMsg}
              </div>
            )}
          </div>
          <DialogFooter className="flex sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setEmailOpen(false)} className="rounded-xl">
              Hủy
            </Button>
            <Button onClick={handleChangeEmail} disabled={isSavingEmail} className="rounded-xl">
              {isSavingEmail ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReadOnlyField({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="space-y-1.5 group">
      <Label className="text-xs font-semibold text-muted-foreground/80 group-focus-within:text-primary transition-colors">{label}</Label>
      <div className="relative flex items-center">
        {Icon && <Icon className="absolute left-3.5 size-4 text-muted-foreground/60" />}
        <Input 
          value={value} 
          readOnly 
          className={`bg-muted/20 border-muted-foreground/10 rounded-xl py-5 font-medium focus-visible:ring-1 focus-visible:ring-primary/20 ${Icon ? "pl-11" : "pl-4"}`} 
        />
      </div>
    </div>
  )
}
