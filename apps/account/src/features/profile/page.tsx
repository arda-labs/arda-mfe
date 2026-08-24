import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { api } from "@workspace/api"
import { uploadAvatar, uploadCover } from "@workspace/media"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuthStore, type AuthUser } from "@workspace/auth/store"
import { translateApiError, useI18n } from "@workspace/i18n"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { notify } from "@workspace/ui/feedback/notify"
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

const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(160, "Name is too long"),
  nickname: z.string().trim().max(80, "Nickname is too long").optional(),
  firstName: z.string().trim().max(80, "First name is too long").optional(),
  lastName: z.string().trim().max(80, "Last name is too long").optional(),
  phoneNumber: z.string().trim().max(32, "Phone is too long").optional(),
  birthdate: z.string().trim().optional(),
  gender: z.string().trim().max(32, "Gender is too long").optional(),
  address: z.string().trim().max(255, "Address is too long").optional(),
  country: z.string().trim().max(80, "Country is too long").optional(),
  headline: z.string().trim().max(128, "Position is too long").optional(),
  department: z.string().trim().max(128, "Department is too long").optional(),
  employeeId: z.string().trim().max(64, "Employee ID is too long").optional(),
  approvalLevel: z
    .string()
    .trim()
    .max(64, "Approval level is too long")
    .optional(),
  dailyLimit: z.string().trim().max(64, "Daily limit is too long").optional(),
  bio: z.string().trim().max(1000, "Bio is too long").optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfilePage() {
  const username = getPublicProfileUsername()
  const { user, updateUser } = useAuthStore()
  const { t } = useI18n()
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const userUsername =
    user?.username || (user?.email ? user.email.split("@")[0] : "")
  const isCurrentUser = Boolean(
    user && (userUsername === username || username === "me")
  )
  const currentUser = isCurrentUser ? user : null

  const [isEditing, setIsEditing] = useState(false)
  const [coverUrl, setCoverUrl] = useState(currentUser?.coverImage || "")
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  const profileDefaultValues: ProfileFormValues = {
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
  }
  const {
    control,
    formState: { errors, isSubmitting: isSavingProfile },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: profileDefaultValues,
  })
  const profileValues = watch()

  useEffect(() => {
    reset(profileDefaultValues)
    setCoverUrl(currentUser?.coverImage || "")
  }, [currentUser, reset])

  const profile = {
    ...profileValues,
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

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
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

    setUploadingAvatar(true)
    try {
      const result = await uploadAvatar(file, user.userId || user.sub)
      updateUser({ picture: result.url, avatarFileId: result.public_id })
      notify.success(t("profile.avatar.upload_success"))
    } catch (reason) {
      notify.error(translateApiError(reason, "profile.avatar.upload_failed"))
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const handleCoverFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
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

    setUploadingCover(true)
    try {
      const result = await uploadCover(file, user.userId || user.sub)
      setCoverUrl(result.url)
      updateUser({ coverImage: result.url, coverFileId: result.public_id })
      notify.success("Cover image updated")
    } catch (reason) {
      notify.error(translateApiError(reason, "Failed to upload cover image"))
    } finally {
      setUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ""
    }
  }

  const handleSave = handleSubmit(async (values) => {
    if (!isCurrentUser) {
      setIsEditing(false)
      return
    }

    const finalDisplayName =
      values.lastName && values.firstName
        ? `${values.lastName} ${values.firstName}`
        : values.name

    setSavingProfile(true)
    try {
      const updated = await api.put<Partial<AuthUser>>("/api/iam/me/profile", {
        name: finalDisplayName,
        nickname: values.nickname,
        first_name: values.firstName,
        last_name: values.lastName,
        phone_number: values.phoneNumber,
        birthdate: values.birthdate,
        gender: values.gender,
        address: values.address,
        country: values.country,
        headline: values.headline,
        department: values.department,
        employee_id: values.employeeId,
        approval_level: values.approvalLevel,
        daily_limit: values.dailyLimit,
        bio: values.bio,
      })
      updateUser({
        name: finalDisplayName,
        displayName: finalDisplayName,
        nickname: updated.nickname || values.nickname,
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
    } catch (reason) {
      notify.error(translateApiError(reason, "Error updating profile"))
    } finally {
      setSavingProfile(false)
    }
  })

  const startEditing = () => {
    reset(profileDefaultValues)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    reset(profileDefaultValues)
    setIsEditing(false)
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:px-6">
        <section className="rounded-lg border bg-card">
          <div
            className="relative h-52 overflow-hidden rounded-t-lg bg-muted bg-cover bg-center md:h-64"
            style={
              coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined
            }
          >
            <div className="absolute inset-0 bg-linear-to-b from-black/10 to-black/35" />
            {isCurrentUser && isEditing && (
              <div className="absolute right-4 bottom-4">
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
                  disabled={uploadingCover}
                  onClick={() => coverInputRef.current?.click()}
                  className="gap-2"
                >
                  <Camera className="size-4" />
                  {uploadingCover
                    ? t("profile.cover.uploading")
                    : t("profile.cover.upload")}
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:p-6">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
              <div className="-mt-16 shrink-0">
                <div className="relative">
                  <Avatar className="size-28 border-4 border-card md:size-32">
                    <AvatarImage
                      src={profile.picture}
                      alt={displayName}
                      className="object-cover"
                    />
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
                        disabled={uploadingAvatar}
                        className="absolute right-1 bottom-1 rounded-full bg-primary p-2 text-primary-foreground shadow-sm hover:bg-primary/90"
                      >
                        {uploadingAvatar ? (
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
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {profile.headline}
                  </p>
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
                    <Button
                      variant="outline"
                      onClick={cancelEditing}
                      className="gap-2"
                    >
                      <X className="size-4" />
                      {t("common.action.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      form="profile-edit-form"
                      disabled={isSavingProfile || savingProfile}
                      className="gap-2"
                    >
                      <Check className="size-4" />
                      {t("profile.save_changes")}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={startEditing}
                    className="gap-2"
                  >
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
            <h2 className="text-base font-semibold">
              {t("profile.edit_profile")}
            </h2>
            <form
              id="profile-edit-form"
              onSubmit={handleSave}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <FormField
                label="Last name"
                htmlFor="profile_last_name"
                error={errors.lastName?.message}
              >
                <Input
                  id="profile_last_name"
                  aria-invalid={Boolean(errors.lastName)}
                  {...register("lastName")}
                />
              </FormField>
              <FormField
                label="First name"
                htmlFor="profile_first_name"
                error={errors.firstName?.message}
              >
                <Input
                  id="profile_first_name"
                  aria-invalid={Boolean(errors.firstName)}
                  {...register("firstName")}
                />
              </FormField>
              <FormField
                label="Nickname"
                htmlFor="profile_nickname"
                error={errors.nickname?.message}
              >
                <Input
                  id="profile_nickname"
                  aria-invalid={Boolean(errors.nickname)}
                  {...register("nickname")}
                />
              </FormField>
              <FormField
                label="Phone"
                htmlFor="profile_phone"
                error={errors.phoneNumber?.message}
              >
                <Input
                  id="profile_phone"
                  aria-invalid={Boolean(errors.phoneNumber)}
                  {...register("phoneNumber")}
                />
              </FormField>
              <FormField
                label="Birthdate"
                htmlFor="profile_birthdate"
                error={errors.birthdate?.message}
              >
                <Controller
                  control={control}
                  name="birthdate"
                  render={({ field }) => (
                    <MaskInput
                      id="profile_birthdate"
                      mask="date"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      className="h-10 w-full"
                    />
                  )}
                />
              </FormField>
              <FormField
                label="Gender"
                htmlFor="profile_gender"
                error={errors.gender?.message}
              >
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger
                        id="profile_gender"
                        aria-invalid={Boolean(errors.gender)}
                      >
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label="Address"
                htmlFor="profile_address"
                error={errors.address?.message}
              >
                <Input
                  id="profile_address"
                  aria-invalid={Boolean(errors.address)}
                  {...register("address")}
                />
              </FormField>
              <FormField
                label="Country"
                htmlFor="profile_country"
                error={errors.country?.message}
              >
                <Input
                  id="profile_country"
                  aria-invalid={Boolean(errors.country)}
                  {...register("country")}
                />
              </FormField>
              <FormField
                label={t("profile.position_title")}
                htmlFor="profile_headline"
                error={errors.headline?.message}
              >
                <Input
                  id="profile_headline"
                  aria-invalid={Boolean(errors.headline)}
                  {...register("headline")}
                />
              </FormField>
              <FormField
                label={t("profile.department")}
                htmlFor="profile_department"
                error={errors.department?.message}
              >
                <Input
                  id="profile_department"
                  aria-invalid={Boolean(errors.department)}
                  {...register("department")}
                />
              </FormField>
              <FormField
                label={t("profile.approval_level")}
                htmlFor="profile_approval_level"
                error={errors.approvalLevel?.message}
              >
                <Input
                  id="profile_approval_level"
                  aria-invalid={Boolean(errors.approvalLevel)}
                  {...register("approvalLevel")}
                />
              </FormField>
              <FormField
                label={t("profile.daily_limit")}
                htmlFor="profile_daily_limit"
                error={errors.dailyLimit?.message}
              >
                <Input
                  id="profile_daily_limit"
                  aria-invalid={Boolean(errors.dailyLimit)}
                  {...register("dailyLimit")}
                />
              </FormField>
              <FormField
                label={t("profile.bio")}
                htmlFor="profile_bio"
                error={errors.bio?.message}
                className="md:col-span-2"
              >
                <Textarea
                  id="profile_bio"
                  aria-invalid={Boolean(errors.bio)}
                  {...register("bio")}
                />
              </FormField>
            </form>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-lg border bg-card p-5 md:p-6">
              <h2 className="text-base font-semibold">
                {t("profile.org_info")}
              </h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <Detail
                  label={t("profile.department")}
                  value={profile.department}
                  icon={BriefcaseBusiness}
                />
                <Detail
                  label={t("profile.employee_id")}
                  value={profile.employeeId}
                  icon={BadgeCheck}
                />
                <Detail
                  label={t("profile.approval_level")}
                  value={profile.approvalLevel}
                  icon={ShieldCheck}
                />
                <Detail
                  label={t("profile.daily_limit")}
                  value={profile.dailyLimit}
                  icon={Wallet}
                />
              </dl>
              <div className="mt-5 border-t pt-5">
                <h3 className="text-sm font-medium">{t("profile.bio")}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {profile.bio}
                </p>
              </div>
            </section>

            <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Metric
                icon={ShieldCheck}
                label={t("profile.pending_approvals")}
                value="4"
                tone="warning"
              />
              <Metric
                icon={CheckSquare}
                label={t("profile.duty_status")}
                value="On duty"
                tone="success"
              />
              <section className="rounded-lg border bg-card p-5 sm:col-span-2 lg:col-span-1">
                <h2 className="text-base font-semibold">
                  {t("profile.assigned_accounts")}
                </h2>
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
                        <p className="font-mono text-xs text-muted-foreground">
                          {code}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value?: string
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
