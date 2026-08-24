import { Moon, Sun } from "lucide-react"
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

export function AppHeader({
  pageTitle,
  user,
  initials,
  displayUserName,
  logout,
  navigate,
}: {
  pageTitle: ShellPageTitleState | null
  user: AuthUser | null
  initials: string
  displayUserName: string
  logout: () => Promise<void>
  navigate: (pathname: string) => void
}) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light")
  const ThemeIcon = theme === "dark" ? Sun : Moon

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
            user?.username ||
            (user?.email ? user.email.split("@")[0] : "me")
          }
          onLogout={logout}
          navigate={navigate}
          t={t}
        />
      </div>
    </header>
  )
}
