import { useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Laptop, Monitor, Shield, User, Copy, Check, ExternalLink } from "lucide-react"
import { useI18n, type MessageKey } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import { useAuthStore } from "@workspace/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"

const tabs: { href: string; labelKey: MessageKey; icon: LucideIcon }[] = [
  { href: "/my-account/profile", labelKey: "nav.settings.profile", icon: User },
  { href: "/my-account/security", labelKey: "nav.settings.security", icon: Shield },
  { href: "/my-account/sessions", labelKey: "nav.settings.sessions", icon: Laptop },
  { href: "/my-account/devices", labelKey: "nav.settings.devices", icon: Monitor },
  { href: "/settings/appearance", labelKey: "nav.settings.appearance", icon: Monitor },
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

  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const profileIdentifier = user?.username || (user?.email ? user.email.split("@")[0] : "") || user?.name?.toLowerCase().replace(/\s+/g, "") || user?.userId || ""
  const publicProfilePath = `/in/${profileIdentifier}`
  
  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const fullUrl = `${window.location.origin}${publicProfilePath}`
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-1">
      {/* Premium Profile Header Banner */}
      <div 
        className="relative overflow-hidden rounded-2xl border bg-card/45 backdrop-blur-md p-6 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm hover:shadow-md transition-all duration-300 group"
      >
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <button type="button" onClick={() => navigate(publicProfilePath)} className="shrink-0">
            <Avatar className="size-20 ring-4 ring-background shadow-md transition-transform duration-300 hover:scale-105">
              <AvatarImage src={user?.picture} alt={user?.name || ""} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">{initials}</AvatarFallback>
            </Avatar>
          </button>
          <div className="text-center sm:text-left space-y-1.5">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <button 
                type="button" 
                onClick={() => navigate(publicProfilePath)} 
                className="flex items-center gap-1.5 text-xl font-bold text-foreground hover:text-primary transition-colors"
              >
                <span>{user?.name || "User Profile"}</span>
                <ExternalLink className="size-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground/80">
              <span>Path: {publicProfilePath}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopyLink} 
            className="rounded-xl border-muted-foreground/20 hover:bg-muted font-semibold transition-all py-4 px-3 flex items-center gap-1.5 text-xs"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy profile link</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Horizontal Tabs Navigation */}
      <div className="border-b border-muted/60">
        <nav className="flex space-x-1 overflow-x-auto pb-px scrollbar-none">
          {tabs.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href === "/my-account/profile" && pathname === "/my-account")
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={cn(
                  "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-all group",
                  isActive
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{t(item.labelKey)}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Contents Container */}
      <div className="rounded-2xl border bg-card/20 backdrop-blur-sm p-6 shadow-sm md:p-8">{children}</div>
    </div>
  )
}
