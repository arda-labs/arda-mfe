import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Laptop, Monitor, Shield, User } from "lucide-react"
import { useI18n, type MessageKey } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"

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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-1">
      <div className="border-b border-muted/60">
        <nav className="flex space-x-1 overflow-x-auto pb-px">
          {tabs.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => navigate(item.href)}
                className={cn(
                  "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{t(item.labelKey)}</span>
              </button>
            )
          })}
        </nav>
      </div>
      <div className="rounded-lg border bg-card/20 p-6 shadow-sm md:p-8">{children}</div>
    </div>
  )
}
