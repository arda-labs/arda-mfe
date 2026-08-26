import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, Outlet } from "react-router-dom"
import { Maximize2, PanelLeftClose, PanelLeftOpen, X } from "lucide-react"
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
import { OlorinPanel, OlorinProvider, OlorinWorkspace } from "@workspace/ai"
import { GlobalErrorDialog } from "@workspace/ui/feedback/global-error-dialog"
import {
  navItems,
  filterNavItems,
  getNavNodeId,
} from "./config/nav-config"
import { SidebarNode } from "./components/SidebarNav"
import { AppHeader } from "./components/AppHeader"

const aiEnabled = import.meta.env.VITE_AI_ENABLED !== "false"

const AI_PANEL_WIDTH_KEY = "arda-ai-panel-width"
const AI_PANEL_MIN_WIDTH = 320
const AI_PANEL_MAX_WIDTH = 720
const AI_PANEL_DEFAULT_WIDTH = 380

function loadAiPanelWidth(): number {
  if (typeof localStorage === "undefined") return AI_PANEL_DEFAULT_WIDTH
  const stored = Number(localStorage.getItem(AI_PANEL_WIDTH_KEY))
  if (!Number.isFinite(stored)) return AI_PANEL_DEFAULT_WIDTH
  return Math.min(
    AI_PANEL_MAX_WIDTH,
    Math.max(AI_PANEL_MIN_WIDTH, Math.round(stored))
  )
}

function formatUserLabel(name: string, nickname?: string) {
  const cleanNickname = nickname?.trim()
  return cleanNickname ? `${name} (${cleanNickname})` : name
}

type AiView = "closed" | "panel" | "full"

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
  const [aiView, setAiView] = useState<AiView>("closed")
  const [aiPanelWidth, setAiPanelWidth] = useState(loadAiPanelWidth)
  const aiPanelResizing = useRef(false)
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "j") {
        event.preventDefault()
        setAiView((current) => (current === "closed" ? "panel" : "closed"))
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const startAiPanelResize = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    aiPanelResizing.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [])

  useEffect(() => {
    function onMove(event: MouseEvent) {
      if (!aiPanelResizing.current) return
      const width = Math.min(
        AI_PANEL_MAX_WIDTH,
        Math.max(AI_PANEL_MIN_WIDTH, window.innerWidth - event.clientX)
      )
      setAiPanelWidth(width)
    }
    function onUp() {
      if (!aiPanelResizing.current) return
      aiPanelResizing.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      setAiPanelWidth((width) => {
        localStorage.setItem(AI_PANEL_WIDTH_KEY, String(width))
        return width
      })
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
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
          aiPanelOpen={aiEnabled && aiView !== "closed"}
          onToggleAiPanel={
            aiEnabled
              ? () =>
                  setAiView((current) =>
                    current === "panel" ? "closed" : "panel"
                  )
              : undefined
          }
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
          <Toaster />
          <GlobalErrorDialog />
        </main>
      </div>
      {aiEnabled && aiView === "panel" ? (
        <aside
          aria-label={t("ai.name")}
          style={{ width: aiPanelWidth }}
          className="relative hidden shrink-0 flex-col overflow-hidden border-l bg-background md:flex"
        >
          <div
            onMouseDown={startAiPanelResize}
            className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-primary/20"
          />
          <div className="flex h-[52px] shrink-0 items-center gap-2 border-b px-3">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {t("ai.name")}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {t("ai.tagline")}
              </span>
            </p>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("ai.panel.expand")}
              title={t("ai.panel.expand")}
              onClick={() => setAiView("full")}
              className="size-8"
            >
              <Maximize2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("ai.panel.close")}
              onClick={() => setAiView("closed")}
              className="size-8"
            >
              <X className="size-4" />
            </Button>
          </div>
          <OlorinProvider>
            <OlorinPanel className="min-h-0 flex-1" />
          </OlorinProvider>
        </aside>
      ) : null}
      {aiEnabled && aiView === "full" ? (
        <OlorinWorkspace
          onMinimize={() => setAiView("panel")}
          onExit={() => setAiView("panel")}
        />
      ) : null}
    </div>
  )
}
