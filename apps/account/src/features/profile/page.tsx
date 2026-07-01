import { useRef, useState, type ChangeEvent, type ReactNode } from "react"
import { useAuthStore } from "@workspace/auth"
import { useI18n } from "@workspace/i18n"
import { uploadAvatar, uploadCover } from "@workspace/media"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { notify } from "@workspace/notifications/notify"
import {
  BadgeCheck,
  BriefcaseBusiness,
  Camera,
  Check,
  CheckSquare,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react"

function getPublicProfileUsername() {
  if (typeof window === "undefined") return "me"
  const match = window.location.pathname.match(/^\/in\/([^/?#]+)/)
  return match ? decodeURIComponent(match[1]) : "me"
}

function formatDisplayName(name: string, nickname?: string) {
  const cleanNickname = nickname?.trim()
  return cleanNickname ? `${name} (${cleanNickname})` : name
}

export function ProfilePage() {
  const username = getPublicProfileUsername()
  const { user, updateUser } = useAuthStore()
  const { t } = useI18n()
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const userUsername = user?.username || (user?.email ? user.email.split("@")[0] : "")
  const isCurrentUser = Boolean(user && (userUsername === username || username === "me"))
  const currentUser = isCurrentUser ? user : null

  const [isEditing, setIsEditing] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [coverUrl, setCoverUrl] = useState(currentUser?.coverImage || "")
  const [formData, setFormData] = useState({
    name: currentUser?.name || username,
    nickname: currentUser?.nickname || "",
    firstName: currentUser?.firstName || "",
    lastName: currentUser?.lastName || "",
    phoneNumber: currentUser?.phoneNumber || "",
    birthdate: currentUser?.birthdate || "",
    gender: currentUser?.gender || "",
    address: currentUser?.address || "",
    country: currentUser?.country || "",
    headline: currentUser?.position || "Financial operations",
    department: currentUser?.department || "Operations",
    employeeId: currentUser?.employeeId || "N/A",
    approvalLevel: currentUser?.approvalLevel || "Standard",
    dailyLimit: currentUser?.dailyLimit || "N/A",
    bio: currentUser?.bio || "No profile summary yet.",
  })

  const profile = {
    ...formData,
    name: currentUser?.name || formData.name,
    nickname: currentUser?.nickname || formData.nickname,
    headline: currentUser?.position || formData.headline,
    department: currentUser?.department || formData.department,
    employeeId: currentUser?.employeeId || formData.employeeId,
    approvalLevel: currentUser?.approvalLevel || formData.approvalLevel,
    dailyLimit: currentUser?.dailyLimit || formData.dailyLimit,
    bio: currentUser?.bio || formData.bio,
    email: currentUser?.email || `${username}@arda.local`,
    picture: currentUser?.picture || "",
  }
  const displayName = formatDisplayName(profile.name, profile.nickname)
  const initials = (displayName || username)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  const location = [profile.address, profile.country].filter(Boolean).join(", ")

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith("image/")) {
      notify.error(t("profile.avatar.invalid_type"))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error(t("profile.avatar.too_large"))
      return
    }

    setIsUploadingAvatar(true)
    try {
      const result = await uploadAvatar(file, user.userId || user.sub)
      updateUser({ picture: result.url, avatarFileId: result.public_id })
      notify.success(t("profile.avatar.upload_success"))
    } catch {
      notify.error(t("profile.avatar.upload_failed"))
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const handleCoverFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith("image/")) {
      notify.error(t("profile.avatar.invalid_type"))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      notify.error("Cover image must be at most 10MB")
      return
    }

    setIsUploadingCover(true)
    try {
      const result = await uploadCover(file, user.userId || user.sub)
      setCoverUrl(result.url)
      updateUser({ coverImage: result.url, coverFileId: result.public_id })
      notify.success("Cover image updated")
    } catch {
      notify.error("Failed to upload cover image")
    } finally {
      setIsUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (!isCurrentUser) {
      setIsEditing(false)
      return
    }

    try {
      const finalDisplayName =
        formData.lastName && formData.firstName
          ? `${formData.lastName} ${formData.firstName}`
          : formData.name
      const res = await fetch("/api/iam/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalDisplayName,
          nickname: formData.nickname,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phoneNumber,
          birthdate: formData.birthdate,
          gender: formData.gender,
          address: formData.address,
          country: formData.country,
          headline: formData.headline,
          department: formData.department,
          employee_id: formData.employeeId,
          approval_level: formData.approvalLevel,
          daily_limit: formData.dailyLimit,
          bio: formData.bio,
        }),
      })
      if (!res.ok) throw new Error("Failed to update profile")

      const updated = await res.json()
      updateUser({
        name: finalDisplayName,
        displayName: finalDisplayName,
        nickname: updated.nickname || formData.nickname,
        firstName: updated.firstName,
        lastName: updated.lastName,
        phoneNumber: updated.phoneNumber,
        birthdate: updated.birthdate,
        gender: updated.gender,
        address: updated.address,
        country: updated.country,
        position: updated.position,
        department: updated.department,
        employeeId: updated.employeeId,
        approvalLevel: updated.approvalLevel,
        dailyLimit: updated.dailyLimit,
        bio: updated.bio,
      })
      notify.success(t("profile.update_success"))
      setIsEditing(false)
    } catch {
      notify.error("Error updating profile")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="overflow-hidden rounded-lg border bg-card">
        <div
          className="relative h-52 bg-muted bg-cover bg-center md:h-64"
          style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
        >
          <div className="absolute inset-0 bg-linear-to-b from-black/10 to-black/35" />
          {isCurrentUser && isEditing && (
            <div className="absolute bottom-4 right-4">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleCoverFileChange}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isUploadingCover}
                onClick={() => coverInputRef.current?.click()}
                className="gap-2"
              >
                <Camera className="size-4" />
                {isUploadingCover ? t("profile.cover.uploading") : t("profile.cover.upload")}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:p-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
            <div className="-mt-16 shrink-0">
              <div className="relative">
                <Avatar className="size-28 border-4 border-card md:size-32">
                  <AvatarImage src={profile.picture} alt={displayName} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isCurrentUser && (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-1 right-1 rounded-full bg-primary p-2 text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      {isUploadingAvatar ? (
                        <span className="block size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      ) : (
                        <Camera className="size-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                    {displayName}
                  </h1>
                  <Badge variant="secondary" className="gap-1">
                    <BadgeCheck className="size-3" />
                    {profile.employeeId}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{profile.headline}</p>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-4" />
                  {profile.email}
                </span>
                {profile.phoneNumber && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-4" />
                    {profile.phoneNumber}
                  </span>
                )}
                {location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isCurrentUser && (
            <div className="flex gap-2 md:justify-end">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="gap-2">
                    <X className="size-4" />
                    {t("common.action.cancel")}
                  </Button>
                  <Button onClick={handleSave} className="gap-2">
                    <Check className="size-4" />
                    {t("profile.save_changes")}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                  <Pencil className="size-4" />
                  {t("profile.edit_profile")}
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {isEditing ? (
        <section className="rounded-lg border bg-card p-5 md:p-6">
          <h2 className="text-base font-semibold">{t("profile.edit_profile")}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Last name">
              <Input value={formData.lastName} onChange={(event) => setFormData((p) => ({ ...p, lastName: event.target.value }))} />
            </Field>
            <Field label="First name">
              <Input value={formData.firstName} onChange={(event) => setFormData((p) => ({ ...p, firstName: event.target.value }))} />
            </Field>
            <Field label="Nickname">
              <Input value={formData.nickname} onChange={(event) => setFormData((p) => ({ ...p, nickname: event.target.value }))} />
            </Field>
            <Field label="Phone">
              <Input value={formData.phoneNumber} onChange={(event) => setFormData((p) => ({ ...p, phoneNumber: event.target.value }))} />
            </Field>
            <Field label="Birthdate">
              <MaskInput
                mask="date"
                value={formData.birthdate}
                onValueChange={(masked) => setFormData((p) => ({ ...p, birthdate: masked }))}
                className="h-10 w-full"
              />
            </Field>
            <Field label="Gender">
              <Select value={formData.gender} onValueChange={(gender) => setFormData((p) => ({ ...p, gender }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Address">
              <Input value={formData.address} onChange={(event) => setFormData((p) => ({ ...p, address: event.target.value }))} />
            </Field>
            <Field label="Country">
              <Input value={formData.country} onChange={(event) => setFormData((p) => ({ ...p, country: event.target.value }))} />
            </Field>
            <Field label={t("profile.position_title")}>
              <Input value={formData.headline} onChange={(event) => setFormData((p) => ({ ...p, headline: event.target.value }))} />
            </Field>
            <Field label={t("profile.department")}>
              <Input value={formData.department} onChange={(event) => setFormData((p) => ({ ...p, department: event.target.value }))} />
            </Field>
            <Field label={t("profile.approval_level")}>
              <Input value={formData.approvalLevel} onChange={(event) => setFormData((p) => ({ ...p, approvalLevel: event.target.value }))} />
            </Field>
            <Field label={t("profile.daily_limit")}>
              <Input value={formData.dailyLimit} onChange={(event) => setFormData((p) => ({ ...p, dailyLimit: event.target.value }))} />
            </Field>
            <Field label={t("profile.bio")} className="md:col-span-2">
              <Textarea value={formData.bio} onChange={(event) => setFormData((p) => ({ ...p, bio: event.target.value }))} />
            </Field>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-lg border bg-card p-5 md:p-6">
            <h2 className="text-base font-semibold">{t("profile.org_info")}</h2>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Detail label={t("profile.department")} value={profile.department} icon={BriefcaseBusiness} />
              <Detail label={t("profile.employee_id")} value={profile.employeeId} icon={BadgeCheck} />
              <Detail label={t("profile.approval_level")} value={profile.approvalLevel} icon={ShieldCheck} />
              <Detail label={t("profile.daily_limit")} value={profile.dailyLimit} icon={Wallet} />
            </dl>
            <div className="mt-5 border-t pt-5">
              <h3 className="text-sm font-medium">{t("profile.bio")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{profile.bio}</p>
            </div>
          </section>

          <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Metric icon={ShieldCheck} label={t("profile.pending_approvals")} value="4" tone="warning" />
            <Metric icon={CheckSquare} label={t("profile.duty_status")} value="On duty" tone="success" />
            <section className="rounded-lg border bg-card p-5 sm:col-span-2 lg:col-span-1">
              <h2 className="text-base font-semibold">{t("profile.assigned_accounts")}</h2>
              <div className="mt-4 space-y-3">
                {[
                  ["1111", "Cash in hand"],
                  ["1121", "Vietcombank VND Operating"],
                  ["1122", "BIDV USD Treasury"],
                ].map(([code, name]) => (
                  <div key={code} className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Wallet className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof BriefcaseBusiness
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-lg border bg-background p-4">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-1 truncate text-sm font-medium">{value || "-"}</dd>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldCheck
  label: string
  value: string
  tone: "success" | "warning"
}) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-lg font-semibold">{value}</p>
        </div>
        <div
          className={
            tone === "success"
              ? "flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600"
              : "flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"
          }
        >
          <Icon className="size-5" />
        </div>
      </div>
    </section>
  )
}
