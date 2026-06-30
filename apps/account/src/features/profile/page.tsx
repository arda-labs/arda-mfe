import { useState, useMemo } from "react"
import { useAuthStore } from "@workspace/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { MapPin, Mail, Pencil, ShieldCheck, CheckSquare, Users, Wallet, Check, X, Camera } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { uploadCover, uploadAvatar } from "@workspace/media"
import { MaskInput } from "@workspace/ui/components/mask-input"

function formatDisplayLabel(displayName: string, nickname?: string) {
  const cleanNickname = nickname?.trim()
  return cleanNickname ? `${displayName} (${cleanNickname})` : displayName
}

export function ProfilePage() {
  const username = getPublicProfileUsername()
  const { user, updateUser } = useAuthStore()
  const { t } = useI18n()

  // Determine if this is the current user's profile
  const userUsername = user?.username || (user?.email ? user.email.split("@")[0] : "")
  const isCurrentUser = user && (userUsername === username || username === "me")
  const currentUser = isCurrentUser ? user : null

  // State for Edit Mode
  const [isEditing, setIsEditing] = useState(false)
  const coverInputRef = useMemo(() => ({ current: null as HTMLInputElement | null }), [])
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [coverUrl, setCoverUrl] = useState(currentUser?.coverImage || "")

  const avatarInputRef = useMemo(() => ({ current: null as HTMLInputElement | null }), [])
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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
    } catch (err) {
      notify.error(t("profile.avatar.upload_failed"))
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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
      notify.success("Cover image updated successfully!")
    } catch (err) {
      notify.error("Failed to upload cover image")
    } finally {
      setIsUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ""
    }
  }
  
  // Custom fintech-banking profile fields initialized from user store
  const [formData, setFormData] = useState({
    name: currentUser ? (currentUser.name || "Member") : `${username}`,
    nickname: currentUser ? (currentUser.nickname || "") : "",
    firstName: currentUser ? (currentUser.firstName || "") : "",
    lastName: currentUser ? (currentUser.lastName || "") : "",
    phoneNumber: currentUser ? (currentUser.phoneNumber || "") : "",
    birthdate: currentUser ? (currentUser.birthdate || "") : "",
    gender: currentUser ? (currentUser.gender || "") : "",
    address: currentUser ? (currentUser.address || "") : "",
    country: currentUser ? (currentUser.country || "") : "",
    headline: currentUser ? (currentUser.position || "Senior Financial Controller") : "Senior Financial Controller",
    department: currentUser ? (currentUser.department || "Finance & Accounting") : "Finance & Accounting",
    employeeId: currentUser ? (currentUser.employeeId || "EMP-ARDA-089") : "EMP-ARDA-089",
    approvalLevel: currentUser ? (currentUser.approvalLevel || "Level 3 (High Limit)") : "Level 3 (High Limit)",
    dailyLimit: currentUser ? (currentUser.dailyLimit || "5,000,000,000 VND") : "5,000,000,000 VND",
    bio: currentUser ? (currentUser.bio || "Responsible for auditing bank statements, approving large capital transfers, and maintaining internal controls. Ensuring strict compliance with banking regulations.") : "Responsible for auditing bank statements, approving large capital transfers, and maintaining internal controls. Ensuring strict compliance with banking regulations.",
  })

  // Sync state if user updates elsewhere
  const handleSave = async () => {
    if (isCurrentUser) {
      try {
        const finalDisplayName = formData.lastName && formData.firstName
          ? `${formData.lastName} ${formData.firstName}`
          : (formData.name || currentUser?.displayName || currentUser?.name || "")
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
        if (!res.ok) {
          throw new Error("Failed to update profile in database")
        }
        const updatedCtx = await res.json()

        updateUser({
          name: finalDisplayName,
          displayName: finalDisplayName,
          nickname: updatedCtx.nickname || formData.nickname,
          firstName: updatedCtx.firstName,
          lastName: updatedCtx.lastName,
          phoneNumber: updatedCtx.phoneNumber,
          birthdate: updatedCtx.birthdate,
          gender: updatedCtx.gender,
          address: updatedCtx.address,
          country: updatedCtx.country,
          position: updatedCtx.position,
          department: updatedCtx.department,
          employeeId: updatedCtx.employeeId,
          approvalLevel: updatedCtx.approvalLevel,
          dailyLimit: updatedCtx.dailyLimit,
          bio: updatedCtx.bio,
        })
        notify.success(t("profile.update_success"))
        setIsEditing(false)
      } catch (err) {
        notify.error("Error updating profile")
      }
    } else {
      setIsEditing(false)
    }
  }

  const profileData = {
    ...formData,
    name: currentUser ? (currentUser.name || formData.name) : formData.name,
    nickname: currentUser ? (currentUser.nickname || formData.nickname) : formData.nickname,
    headline: currentUser ? (currentUser.position || formData.headline) : formData.headline,
    department: currentUser ? (currentUser.department || formData.department) : formData.department,
    employeeId: currentUser ? (currentUser.employeeId || formData.employeeId) : formData.employeeId,
    approvalLevel: currentUser ? (currentUser.approvalLevel || formData.approvalLevel) : formData.approvalLevel,
    dailyLimit: currentUser ? (currentUser.dailyLimit || formData.dailyLimit) : formData.dailyLimit,
    bio: currentUser ? (currentUser.bio || formData.bio) : formData.bio,
    email: currentUser ? (currentUser.email || "") : `${username}@arda.dev`,
    picture: currentUser ? (currentUser.picture || "") : "",
    initials: currentUser
      ? (currentUser.name || currentUser.email || "?")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : username.slice(0, 2).toUpperCase(),
    assignedAccounts: [
      { code: "1111", name: "Cash in hand", type: "ASSET" },
      { code: "1121", name: "Vietcombank VND Operating Account", type: "ASSET" },
      { code: "1122", name: "BIDV USD Treasury Account", type: "ASSET" },
    ],
    pendingApprovals: 4,
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Profile Card Header (LinkedIn Style) */}
      <Card className="overflow-hidden border shadow-sm">
        {/* Banner */}
        <div 
          className="h-56 bg-linear-to-r from-primary/80 via-primary/60 to-primary/30 relative bg-cover bg-center"
          style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] bg-black/10" />
          
          {isCurrentUser && isEditing && (
            <div className="absolute bottom-3 right-3">
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
                className="gap-1.5 rounded-lg shadow-md bg-background/80 hover:bg-background text-foreground"
              >
                <Camera className="size-4" />
                <span>{isUploadingCover ? t("profile.cover.uploading") : t("profile.cover.upload")}</span>
              </Button>
            </div>
          )}
        </div>
        
        <CardContent className="relative px-6 pb-6 pt-0">
          {/* Avatar Offset */}
          <div className="absolute -top-16 left-6 group/avatar">
            <div className="relative">
              <Avatar className="size-32 border-4 border-card shadow-md transition-transform duration-300 group-hover/avatar:scale-105">
                <AvatarImage src={profileData.picture} alt={formatDisplayLabel(profileData.name, profileData.nickname)} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                  {profileData.initials}
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
                    className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full shadow-md hover:bg-primary/90 transition-transform duration-300 hover:scale-110 cursor-pointer"
                  >
                    {isUploadingAvatar ? (
                      <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end pt-4 min-h-[4rem] gap-2">
            {isCurrentUser ? (
              isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="gap-1">
                    <X className="size-4" />
                    {t("common.action.cancel")}
                  </Button>
                  <Button size="sm" onClick={handleSave} className="gap-1">
                    <Check className="size-4" />
                    {t("profile.save_changes")}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                  <Pencil className="size-4" />
                  {t("profile.edit_profile")}
                </Button>
              )
            ) : (
              <Button size="sm" className="gap-2">
                Connect
              </Button>
            )}
          </div>

          {/* Profile Basic Info */}
          <div className="space-y-4 mt-4">
            {isEditing ? (
              <div className="grid gap-3 max-w-2xl">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Last Name (Họ và đệm)</span>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">First Name (Tên)</span>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Biệt danh</span>
                  <Input
                    value={formData.nickname}
                    placeholder="vd: hoanv"
                    onChange={(e) => setFormData((p) => ({ ...p, nickname: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Phone Number</span>
                    <Input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData((p) => ({ ...p, phoneNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Birthdate (MM/DD/YYYY)</span>
                    <MaskInput
                      mask="date"
                      className="h-10 w-full bg-background py-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [box-shadow:none] dark:bg-background"
                      value={formData.birthdate}
                      onValueChange={(masked) => setFormData((p) => ({ ...p, birthdate: masked }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Gender</span>
                    <Select
                      value={formData.gender}
                      onValueChange={(val) => setFormData((p) => ({ ...p, gender: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Nam (Male)</SelectItem>
                        <SelectItem value="Female">Nữ (Female)</SelectItem>
                        <SelectItem value="Other">Khác (Other)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <span className="text-xs font-semibold text-muted-foreground">Country</span>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Address</span>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">{t("profile.position_title")}</span>
                  <Input
                    value={formData.headline}
                    onChange={(e) => setFormData((p) => ({ ...p, headline: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {formatDisplayLabel(profileData.name, profileData.nickname)}
                </h1>
                <p className="text-sm font-medium text-muted-foreground mt-0.5">{profileData.headline}</p>
              </div>
            )}

            {/* Meta Items */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {profileData.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  <span>{profileData.address}{profileData.country ? `, ${profileData.country}` : ""}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Mail className="size-3.5" />
                <span>{profileData.email}</span>
              </div>
              {profileData.phoneNumber && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Tel:</span>
                  <span>{profileData.phoneNumber}</span>
                </div>
              )}
              {profileData.birthdate && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">DOB:</span>
                  <span>{profileData.birthdate}</span>
                </div>
              )}
              {profileData.gender && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Gender:</span>
                  <span>{profileData.gender}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Users className="size-3.5" />
                <span>{profileData.department}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid Layout for details */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Org & Fintech Information */}
        <Card className="border shadow-sm md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">{t("profile.org_info")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">{t("profile.department")}</span>
                    <Input
                      value={formData.department}
                      onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">{t("profile.employee_id")}</span>
                    <Input
                      value={formData.employeeId}
                      onChange={(e) => setFormData((p) => ({ ...p, employeeId: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">{t("profile.approval_level")}</span>
                    <Input
                      value={formData.approvalLevel}
                      onChange={(e) => setFormData((p) => ({ ...p, approvalLevel: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">{t("profile.daily_limit")}</span>
                    <Input
                      value={formData.dailyLimit}
                      onChange={(e) => setFormData((p) => ({ ...p, dailyLimit: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">{t("profile.bio")}</span>
                  <textarea
                    className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.bio}
                    onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">{t("profile.department")}</span>
                    <span className="font-medium text-foreground">{profileData.department}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">{t("profile.employee_id")}</span>
                    <span className="font-mono text-foreground">{profileData.employeeId}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">{t("profile.approval_level")}</span>
                    <span className="font-medium text-foreground">{profileData.approvalLevel}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground block">{t("profile.daily_limit")}</span>
                    <span className="font-mono text-foreground">{profileData.dailyLimit}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">{t("profile.bio")}</span>
                  <p className="text-xs/relaxed text-muted-foreground">{profileData.bio}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Bank Accounts & Queue Status */}
        <div className="space-y-6">
          {/* Status Metrics */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">{t("profile.banking_queue")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <span className="text-xs font-medium">{t("profile.pending_approvals")}</span>
                </div>
                <Badge variant="destructive" className="font-semibold">{profileData.pendingApprovals}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <CheckSquare className="size-4 text-primary" />
                  <span className="text-xs font-medium">{t("profile.duty_status")}</span>
                </div>
                <Badge variant="default" className="bg-green-600 font-semibold">On Duty</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Managed Accounts */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">{t("profile.assigned_accounts")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profileData.assignedAccounts.map((acc) => (
                <div key={acc.code} className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
                    <Wallet className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold truncate">{acc.name}</h4>
                    <span className="text-[10px] font-mono text-muted-foreground">GL Code: {acc.code}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function getPublicProfileUsername() {
  if (typeof window === "undefined") return "me"
  const match = window.location.pathname.match(/^\/in\/([^/?#]+)/)
  return match ? decodeURIComponent(match[1]) : "me"
}
