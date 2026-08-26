import { useEffect, useState } from "react"
import { useLocation, useNavigate, Outlet } from "react-router-dom"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useSystemBranding } from "@workspace/theme/branding"
import {
  SHELL_PAGE_TITLE_EVENT,
  type ShellPageTitleEventDetail,
  type ShellPageTitleState,
} from "@workspace/ui/shell/page-title"
import { useI18n } from "@workspace/i18n"
import { BrandMark } from "@workspace/ui/components/brand-mark"
import { Button } from "@workspace/ui/components/button"
import { Toaster } from "@workspace/ui/components/toaster"
import { cn } from "@workspace/ui/lib/utils"
import { useAuthStore } from "@workspace/auth"
import { useNotificationStream } from "@workspace/notifications"
import { OlorinDock } from "./features/ai/olorin-dock"
import { GlobalErrorDialog } from "@workspace/ui/feedback/global-error-dialog"
import {
  navItems,
  filterNavItems,
  getNavNodeId,
} from "./config/nav-config"
import { SidebarNode } from "./components/SidebarNav"
import { AppHeader } from "./components/AppHeader"

const aiEnabled = import.meta.env.VITE_AI_ENABLED === "true"

function formatUserLabel(name: string, nickname?: string) {
  const cleanNickname = nickname?.trim()
  return cleanNickname ? `${name} (${cleanNickname})` : name
}

export function ShellLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "nav.admin": true,
    "nav.workbench": true,
    "nav.finance": true,
    "nav.hrm": true,
    "nav.workflow": true,
  })
  const [pageTitle, setPageTitle] = useState<ShellPageTitleState | null>(null)
  const [authHydrated, setAuthHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated()
  )
  const { user, isAuthenticated, logout, switchTenant } = useAuthStore()
  const { t } = useI18n()
  const { branding } = useSystemBranding()
  const visibleNavItems = filterNavItems(navItems, user)
  useNotificationStream(authHydrated && isAuthenticated && Boolean(user))

  useEffect(() => {
    if (authHydrated) return
    return useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true))
  }, [authHydrated])

  useEffect(() => {
    function handlePageTitle(event: Event) {
      const detail = (event as CustomEvent<ShellPageTitleEventDetail>).detail
      if (detail.cleared) {
        setPageTitle((current) => (current?.id === detail.id ? null : current))
        return
      }
      setPageTitle(detail)
    }

    window.addEventListener(SHELL_PAGE_TITLE_EVENT, handlePageTitle)
    return () =>
      window.removeEventListener(SHELL_PAGE_TITLE_EVENT, handlePageTitle)
  }, [])

  const displayUserName = user
    ? formatUserLabel(user.name || "", user.nickname)
    : ""
  const initials = user
    ? (user.name || user.email || "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div className="fixed inset-0 flex min-h-0 overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-[color:var(--layout-sidebar-border)] bg-[var(--layout-sidebar-background)] transition-all duration-200",
          sidebarOpen ? "w-64" : "w-14"
        )}
      >
        <div className="flex h-[52px] items-center gap-3 border-b border-[color:var(--layout-sidebar-border)] px-3">
          <BrandMark
            name={branding.appName}
            logoUrl={branding.dashboardLogoUrl || branding.loginLogoUrl}
            size="sm"
          />
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="truncate text-sm leading-none font-semibold">
                {branding.appName}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {branding.organizationName || "Workspace"}
              </p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {visibleNavItems.map((item) => (
            <SidebarNode
              key={getNavNodeId(item)}
              item={item}
              depth={0}
              locationPath={pathname}
              navigate={navigate}
              sidebarOpen={sidebarOpen}
              openGroups={openGroups}
              setOpenGroups={setOpenGroups}
              t={t}
            />
          ))}
        </nav>
        <div
          className={cn(
            "flex h-[52px] shrink-0 items-center border-t border-[color:var(--layout-sidebar-border)] px-2",
            sidebarOpen ? "justify-end" : "justify-center"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("common.action.toggle_sidebar")}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={t("common.action.toggle_sidebar")}
            className="size-8"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          pageTitle={pageTitle}
          user={user}
          initials={initials}
          displayUserName={displayUserName}
          logout={logout}
          switchTenant={switchTenant}
          navigate={navigate}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
          <Toaster />
          <GlobalErrorDialog />
          {aiEnabled && <OlorinDock />}
        </main>
      </div>
    </div>
  )
}
