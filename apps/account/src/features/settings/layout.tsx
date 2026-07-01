import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Check, Copy, ExternalLink, Laptop, Monitor, Shield, User } from "lucide-react"
import { useAuthStore } from "@workspace/auth"
import { useI18n, type MessageKey } from "@workspace/i18n"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const tabs: { href: string; labelKey: MessageKey; icon: LucideIcon }[] = [
  { href: "/my-account/profile", labelKey: "nav.settings.profile", icon: User },
  { href: "/my-account/security", labelKey: "nav.settings.security", icon: Shield },
  { href: "/my-account/sessions", labelKey: "nav.settings.sessions", icon: Laptop },
  { href: "/my-account/devices", labelKey: "nav.settings.devices", icon: Monitor },
]

export function SettingsLayout({
  children,
  pathname,
  navigate,
}: {
  children: ReactNode
  pathname: string
  navigate: (pathname: string) => void
}) {
  const { t } = useI18n()
  const { user } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const name = user?.name || user?.email || "Account"
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  const profileIdentifier =
    user?.username ||
    (user?.email ? user.email.split("@")[0] : "") ||
    user?.userId ||
    "me"
  const publicProfilePath = `/in/${profileIdentifier}`

  const copyProfileLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${publicProfilePath}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(publicProfilePath)}
            className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="size-14">
              <AvatarImage src={user?.picture} alt={name} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">{name}</h1>
              <button
                type="button"
                onClick={() => navigate(publicProfilePath)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Open public profile"
              >
                <ExternalLink className="size-4" />
              </button>
            </div>
            <p className="truncate text-sm text-muted-foreground">{user?.email || publicProfilePath}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyProfileLink}
          className="w-full justify-center gap-2 md:w-auto"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy profile link"}
        </Button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto border-b pb-2 lg:flex-col lg:overflow-visible lg:border-b-0 lg:pb-0">
          {tabs.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href === "/my-account/profile" && pathname === "/my-account")

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{t(item.labelKey)}</span>
              </button>
            )
          })}
        </nav>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  )
}
