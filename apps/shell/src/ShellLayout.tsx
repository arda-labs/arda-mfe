import type { Dispatch, ReactNode, SetStateAction } from "react"
import { useEffect, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  Info,
  LayoutDashboard,
  ListTree,
  LogOut,
  Moon,
  Palette,
  PanelLeftClose,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Users,
  Wallet,
} from "lucide-react"
import { useI18n, type MessageKey } from "@workspace/i18n"
import type { AuthUser } from "@workspace/auth/store"
import { hasAnyPermission } from "@workspace/auth/store"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Toaster } from "@workspace/ui/components/sonner"
import { cn } from "@workspace/ui/lib/utils"
import { useAuthStore } from "../../../packages/auth/src/index"
import { NotificationBell, useNotificationStream } from "../../../packages/notifications/src/index"
import { useTheme } from "../../../packages/theme/src/index"

type NavNode = {
  href?: string
  labelKey: MessageKey
  icon: LucideIcon
  permissions?: string[]
  children?: NavNode[]
}

const navItems: NavNode[] = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  {
    labelKey: "nav.admin",
    icon: Users,
    children: [
      { href: "/admin/users", labelKey: "nav.admin.users", icon: Users, permissions: ["iam.user.read"] },
      { href: "/admin/roles", labelKey: "nav.admin.roles", icon: Users, permissions: ["iam.role.read"] },
      {
        href: "/admin/permissions",
        labelKey: "nav.admin.permissions",
        icon: ShieldCheck,
        permissions: ["iam.permission.read"],
      },
      { href: "/admin/audit", labelKey: "nav.admin.audit", icon: FileText, permissions: ["iam.user.read"] },
      {
        href: "/admin/settings",
        labelKey: "nav.admin.system_settings",
        icon: Settings,
        permissions: ["platform.manage"],
      },
    ],
  },
  {
    labelKey: "nav.finance",
    icon: Wallet,
    children: [
      { href: "/finance/accounts", labelKey: "nav.finance.accounts", icon: Wallet },
      { href: "/finance/transactions", labelKey: "nav.finance.transactions", icon: FileText },
      { href: "/finance/approvals", labelKey: "nav.finance.approvals", icon: ShieldCheck },
      {
        href: "/finance/trial-balance",
        labelKey: "nav.finance.trial_balance",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    labelKey: "nav.platform",
    icon: Settings,
    children: [
      { href: "/admin/organizations", labelKey: "nav.platform.organizations", icon: Building2, permissions: ["platform.read"] },
      { href: "/admin/parameters", labelKey: "nav.platform.parameters", icon: SlidersHorizontal, permissions: ["platform.manage"] },
      { href: "/admin/provinces", labelKey: "nav.platform.provinces", icon: Building2, permissions: ["platform.read"] },
      { href: "/admin/wards", labelKey: "nav.platform.wards", icon: Building2, permissions: ["platform.read"] },
      { href: "/admin/lookups", labelKey: "nav.platform.lookups", icon: ListTree, permissions: ["platform.manage"] },
      { href: "/admin/area-types", labelKey: "nav.platform.area_types", icon: ListTree, permissions: ["platform.manage"] },
      { href: "/admin/areas", labelKey: "nav.platform.areas", icon: Building2, permissions: ["platform.read"] },
      {
        href: "/admin/credit-institutions",
        labelKey: "nav.platform.credit_institutions",
        icon: Building2,
        permissions: ["platform.read"],
      },
      { href: "/admin/templates", labelKey: "nav.platform.templates", icon: FileText, permissions: ["platform.manage"] },
      { href: "/admin/calendar", labelKey: "nav.platform.calendar", icon: Calendar, permissions: ["platform.manage"] },
      { href: "/admin/cutoff", labelKey: "nav.platform.cutoff", icon: Clock, permissions: ["platform.manage"] },
    ],
  },
]

export function ShellLayout({
  children,
  pathname,
  navigate,
}: {
  children: ReactNode
  pathname: string
  navigate: (pathname: string) => void
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "nav.admin": true,
    "nav.finance": true,
  })
  const [authHydrated, setAuthHydrated] = useState(() => useAuthStore.persist.hasHydrated())
  const { user, isAuthenticated, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const visibleNavItems = filterNavItems(navItems, user)
  useNotificationStream(authHydrated && isAuthenticated && Boolean(user))

  useEffect(() => {
    if (authHydrated) return
    return useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true))
  }, [authHydrated])

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light")
  const ThemeIcon = theme === "dark" ? Sun : Moon
  const displayUserName = user ? formatUserLabel(user.name || "", user.nickname) : ""
  const initials = user
    ? (user.name || user.email || "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r bg-muted/30 transition-all duration-200",
          sidebarOpen ? "w-64" : "w-14"
        )}
      >
        <div className="flex h-14 items-center border-b px-3">
          {sidebarOpen && (
            <span className="truncate text-lg font-semibold tracking-tight">
              {t("common.app.name")}
            </span>
          )}
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {visibleNavItems.map((item) => (
            <SidebarNode
              key={item.labelKey}
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
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between gap-3 border-b bg-background px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={t("common.action.toggle_sidebar")}
            >
              <PanelLeftClose className="size-4" />
            </Button>
            <AppBreadcrumb pathname={pathname} t={t} />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
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
              username={user?.username || (user?.email ? user.email.split("@")[0] : "me")}
              onLogout={logout}
              navigate={navigate}
              t={t}
            />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
          <Toaster />
        </main>
      </div>
    </div>
  )
}

function SidebarNode({
  item,
  depth,
  locationPath,
  navigate,
  sidebarOpen,
  openGroups,
  setOpenGroups,
  t,
}: {
  item: NavNode
  depth: number
  locationPath: string
  navigate: (pathname: string) => void
  sidebarOpen: boolean
  openGroups: Record<string, boolean>
  setOpenGroups: Dispatch<SetStateAction<Record<string, boolean>>>
  t: (key: MessageKey) => string
}) {
  const label = t(item.labelKey)
  const hasChildren = Boolean(item.children?.length)
  const isActive =
    item.href === "/" ? locationPath === "/" : item.href ? locationPath.startsWith(item.href) : false
  const hasActiveChild = hasChildren && item.children?.some((child) => isNodeActive(child, locationPath))
  const isExpanded = openGroups[item.labelKey] ?? hasActiveChild
  const open = sidebarOpen && isExpanded
  const itemClassName = cn(
    "flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm transition-colors",
    isActive || hasActiveChild
      ? "bg-primary/10 font-medium text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  )
  const style = sidebarOpen ? { paddingLeft: `${0.75 + depth * 0.9}rem` } : undefined

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            setOpenGroups((current) => {
              const currentVal = current[item.labelKey] ?? hasActiveChild
              return { ...current, [item.labelKey]: !currentVal }
            })
          }
          className={itemClassName}
          style={style}
          title={!sidebarOpen ? label : undefined}
        >
          <item.icon className="size-4 shrink-0" />
          {sidebarOpen && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{label}</span>
              <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
            </>
          )}
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5">
            {item.children?.map((child) => (
              <SidebarNode
                key={child.labelKey}
                item={child}
                depth={depth + 1}
                locationPath={locationPath}
                navigate={navigate}
                sidebarOpen={sidebarOpen}
                openGroups={openGroups}
                setOpenGroups={setOpenGroups}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!item.href) return null

  return (
    <button
      type="button"
      onClick={() => navigate(item.href!)}
      className={itemClassName}
      style={style}
      title={!sidebarOpen ? label : undefined}
    >
      <item.icon className="size-4 shrink-0" />
      {sidebarOpen && <span className="truncate">{label}</span>}
    </button>
  )
}

function isNodeActive(item: NavNode, pathname: string): boolean {
  if (item.href) return item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  return Boolean(item.children?.some((child) => isNodeActive(child, pathname)))
}

function filterNavItems(items: NavNode[], user: AuthUser | null): NavNode[] {
  const visible: NavNode[] = []
  for (const item of items) {
    const children = item.children ? filterNavItems(item.children, user) : undefined
    if (!hasAnyPermission(user, item.permissions ?? []) && !children?.length) continue
    visible.push({ ...item, children })
  }
  return visible
}

function AppBreadcrumb({
  pathname,
  t,
}: {
  pathname: string
  t: (key: MessageKey) => string
}) {
  const items = getBreadcrumbItems(pathname)
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {items.map((item, index) => [
          index > 0 ? <BreadcrumbSeparator key={`${item.labelKey}-${index}-separator`} /> : null,
          <BreadcrumbItem key={`${item.labelKey}-${index}`} className="min-w-0">
            <BreadcrumbPage className="truncate">{t(item.labelKey)}</BreadcrumbPage>
          </BreadcrumbItem>,
        ])}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function getBreadcrumbItems(pathname: string): { labelKey: MessageKey }[] {
  if (pathname === "/") return [{ labelKey: "nav.dashboard" }]
  const matched = findBreadcrumb(navItems, pathname)
  return matched.length > 0
    ? matched.map((item) => ({ labelKey: item.labelKey }))
    : [{ labelKey: "common.app.name" }]
}

function findBreadcrumb(items: NavNode[], pathname: string, parents: NavNode[] = []): NavNode[] {
  for (const item of items) {
    const nextParents = [...parents, item]
    if (item.href && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))) {
      return nextParents
    }
    if (item.children) {
      const matched = findBreadcrumb(item.children, pathname, nextParents)
      if (matched.length) return matched
    }
  }
  return []
}

function UserMenu({
  initials,
  userName,
  email,
  picture,
  username,
  onLogout,
  navigate,
  t,
}: {
  initials: string
  userName: string
  email: string
  picture: string
  username: string
  onLogout: () => void
  navigate: (pathname: string) => void
  t: (key: MessageKey) => string
}) {
  const [statusOpen, setStatusOpen] = useState(false)
  const [userStatus, setUserStatus] = useState("active")
  const [customStatusText, setCustomStatusText] = useState("")

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Avatar className="size-8 cursor-pointer">
              <AvatarImage src={picture} alt={userName || email || "User"} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-64">
          <DropdownMenuItem
            onClick={() => navigate(`/in/${username}`)}
            className="cursor-pointer px-2 py-2 focus:bg-accent/50"
          >
            <div className="flex w-full min-w-0 items-center gap-3">
              <Avatar className="size-9">
                <AvatarImage src={picture} alt={userName || email || "User"} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{userName || email || "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setStatusOpen(true)}>
            <LayoutDashboard className="size-4" />
            <span>{t("user.menu.set_status")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/my-account/profile")}>
            <Settings className="size-4" />
            <span>{t("user.menu.settings")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings/appearance")}>
            <Palette className="size-4" />
            <span>{t("nav.settings.appearance")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Info className="size-4" />
            <span>{t("user.menu.help_support")}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
            <LogOut className="size-4" />
            {t("common.action.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("user.menu.set_status")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">Quick Status</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "active", label: "Active", color: "bg-green-500" },
                  { value: "away", label: "Away", color: "bg-amber-500" },
                  { value: "busy", label: "Busy", color: "bg-red-500" },
                ].map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setUserStatus(status.value)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border p-2 text-xs font-medium transition-colors hover:bg-muted",
                      userStatus === status.value ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <span className={cn("size-2 rounded-full", status.color)} />
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Custom Message</span>
              <Input
                placeholder="What's happening?"
                value={customStatusText}
                onChange={(event) => setCustomStatusText(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setStatusOpen(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button size="sm" onClick={() => setStatusOpen(false)}>
                {t("common.action.done")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formatUserLabel(name: string, nickname?: string) {
  const cleanNickname = nickname?.trim()
  return cleanNickname ? `${name} (${cleanNickname})` : name
}
