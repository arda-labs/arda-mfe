import { Building2, Check, Moon, Search, Sparkles, Sun } from "lucide-react"
import { useState } from "react"
import {
  SHELL_PAGE_HEADER_SLOT_ID,
  type ShellPageTitleState,
} from "@workspace/ui/shell/page-title"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { NotificationBell } from "@workspace/notifications"
import { useTheme } from "@workspace/theme"
import type { AuthUser } from "@workspace/auth/store"
import { UserMenu } from "./UserMenu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export function AppHeader({
  pageTitle,
  user,
  initials,
  displayUserName,
  logout,
  switchTenant,
  navigate,
  aiPanelOpen = false,
  onToggleAiPanel,
  onOpenCommandPalette,
}: {
  pageTitle: ShellPageTitleState | null
  user: AuthUser | null
  initials: string
  displayUserName: string
  logout: () => Promise<void>
  switchTenant: (tenantId: string) => Promise<void>
  navigate: (pathname: string) => void
  aiPanelOpen?: boolean
  onToggleAiPanel?: () => void
  onOpenCommandPalette?: () => void
}) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const [switchingTenant, setSwitchingTenant] = useState(false)

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light")
  const ThemeIcon = theme === "dark" ? Sun : Moon

  const memberships = user?.tenantMemberships ?? []
  const activeTenantId = user?.activeTenantId || user?.tenantId || ""
  const activeMembership = memberships.find(
    (membership) => membership.tenantId === activeTenantId
  )
  const tenantLabel =
    activeMembership?.tenantName || activeMembership?.tenantCode || ""

  return (
    <header className="flex h-[52px] items-center justify-between gap-3 border-b border-[color:var(--layout-header-border)] bg-[var(--layout-header-background)] px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {pageTitle?.hideTitle ? null : (
          <span
            className={cn(
              "min-w-0 truncate text-base font-semibold transition-[opacity,transform] duration-150",
              pageTitle?.collapsed
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0"
            )}
          >
            {pageTitle?.title}
          </span>
        )}
        <div
          id={SHELL_PAGE_HEADER_SLOT_ID}
          className="min-w-0 flex-1 overflow-hidden empty:hidden"
        />
      </div>
      <div className="flex items-center gap-2">
        {tenantLabel ? (
          memberships.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="max-w-48 gap-2"
                  title={t("navigation.tenant.switch")}
                >
                  <Building2 className="size-3.5" />
                  <span className="truncate">{tenantLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  {t("navigation.tenant.switch")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {memberships.map((membership) => (
                  <DropdownMenuItem
                    key={membership.tenantId}
                    disabled={switchingTenant}
                    onClick={() => {
                      if (membership.tenantId === activeTenantId) {
                        return
                      }
                      setSwitchingTenant(true)
                      void switchTenant(membership.tenantId).finally(() =>
                        setSwitchingTenant(false)
                      )
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {membership.tenantName}
                    </span>
                    {membership.tenantId === activeTenantId ? (
                      <Check className="size-4" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div
              className="hidden h-8 max-w-48 items-center gap-2 rounded-md border border-input bg-transparent px-2.5 text-xs font-medium text-muted-foreground sm:flex"
              title={t("navigation.tenant.current")}
            >
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate">{tenantLabel}</span>
            </div>
          )
        ) : null}
        {onOpenCommandPalette ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCommandPalette}
            className="hidden h-8 gap-2 px-2.5 text-xs text-muted-foreground hover:text-foreground sm:flex"
            title="Tìm kiếm nhanh (Ctrl+K / ⌘K)"
          >
            <Search className="size-3.5" />
            <span className="hidden md:inline">Tìm kiếm...</span>
            <kbd className="pointer-events-none hidden h-4.5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        ) : null}
        {onToggleAiPanel ? (
          <Button
            variant={aiPanelOpen ? "secondary" : "outline"}
            size="sm"
            aria-label={t("ai.panel.open")}
            aria-pressed={aiPanelOpen}
            title={`${t("ai.panel.ask")} · ${t("ai.panel.shortcut_hint")}`}
            onClick={onToggleAiPanel}
            className="h-8 gap-1.5 px-2.5"
          >
            <Sparkles className="size-3.5" />
            <span className="hidden lg:inline">{t("ai.panel.ask")}</span>
          </Button>
        ) : null}
        <NotificationBell />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.action.toggle_theme")}
          onClick={toggleTheme}
          title={t("common.action.toggle_theme")}
          className="size-8"
        >
          <ThemeIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocale(locale === "vi-VN" ? "en-US" : "vi-VN")}
          className="h-8 px-2 text-xs font-semibold"
        >
          {locale === "vi-VN" ? "VI" : "EN"}
        </Button>
        <UserMenu
          initials={initials}
          userName={displayUserName}
          email={user?.email || ""}
          picture={user?.picture || ""}
          username={
            user?.username || (user?.email ? user.email.split("@")[0] : "me")
          }
          onLogout={logout}
          navigate={navigate}
          t={t}
        />
      </div>
    </header>
  )
}
