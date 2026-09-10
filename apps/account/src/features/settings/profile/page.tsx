import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { BadgeCheck, Copy, Mail, ShieldCheck, User2 } from "lucide-react"
import { useAuthStore } from "@workspace/auth/store"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { AvatarCard } from "./components/AvatarCard"
import { EmailDialog } from "./components/EmailDialog"
import { PreferencesCard } from "./components/PreferencesCard"

export function ProfilePage() {
  const { t } = useI18n()
  const { user } = useAuthStore()
  const [emailOpen, setEmailOpen] = useState(false)

  const publicProfilePath = `/in/${user?.username || (user?.email ? user.email.split("@")[0] : "me")}`

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

        <div className="mt-6">
          <PreferencesCard />
        </div>
      </section>

      <AvatarCard />

      <EmailDialog open={emailOpen} onOpenChange={setEmailOpen} />
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
