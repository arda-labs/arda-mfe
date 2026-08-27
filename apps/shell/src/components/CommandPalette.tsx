import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  Building2,
  Globe,
  LogOut,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react"
import { useI18n, type MessageKey } from "@workspace/i18n"
import { useTheme } from "@workspace/theme"
import { useAuthStore } from "@workspace/auth/store"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@workspace/ui/components/command"
import {
  navItems,
  filterNavItems,
  getNavLabel,
  type NavNode,
} from "../config/nav-config"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggleAi?: () => void
}

type FlatNavItem = {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  groupLabel?: string
}

function flattenNavItems(
  items: NavNode[],
  t: (key: MessageKey) => string,
  parentLabel?: string
): FlatNavItem[] {
  const result: FlatNavItem[] = []

  for (const item of items) {
    const label = getNavLabel(item, t)
    if (item.href) {
      result.push({
        id: item.href,
        label,
        href: item.href,
        icon: item.icon,
        groupLabel: parentLabel,
      })
    }
    if (item.children?.length) {
      result.push(...flattenNavItems(item.children, t, label))
    }
  }

  return result
}

export function CommandPalette({
  open,
  onOpenChange,
  onToggleAi,
}: CommandPaletteProps) {
  const navigate = useNavigate()
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const { user, logout, switchTenant } = useAuthStore()

  const visibleNavItems = React.useMemo(
    () => filterNavItems(navItems, user),
    [user]
  )

  const flatItems = React.useMemo(
    () => flattenNavItems(visibleNavItems, t),
    [visibleNavItems, t]
  )

  const handleSelectRoute = (href: string) => {
    onOpenChange(false)
    navigate(href)
  }

  const handleToggleTheme = () => {
    onOpenChange(false)
    setTheme(theme === "light" ? "dark" : "light")
  }

  const handleToggleLocale = () => {
    onOpenChange(false)
    setLocale(locale === "vi-VN" ? "en-US" : "vi-VN")
  }

  const handleOpenAi = () => {
    onOpenChange(false)
    if (onToggleAi) onToggleAi()
  }

  const handleLogout = () => {
    onOpenChange(false)
    void logout()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("command_palette.placeholder")} />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>{t("command_palette.no_results")}</CommandEmpty>

        <CommandGroup heading={t("command_palette.navigation")}>
          {flatItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.id}
                value={`${item.label} ${item.groupLabel || ""} ${item.href}`}
                onSelect={() => handleSelectRoute(item.href)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 size-4 text-muted-foreground" />
                <span className="flex-1">
                  {item.groupLabel ? (
                    <span className="text-muted-foreground mr-1">
                      {item.groupLabel} /
                    </span>
                  ) : null}
                  {item.label}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {item.href}
                </span>
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("command_palette.actions")}>
          {onToggleAi ? (
            <CommandItem value="Hỏi trợ lý AI Assistant Olorin" onSelect={handleOpenAi} className="cursor-pointer">
              <Sparkles className="mr-2 size-4 text-primary" />
              <span>{t("command_palette.ai_assistant")}</span>
              <CommandShortcut>Ctrl+J</CommandShortcut>
            </CommandItem>
          ) : null}

          <CommandItem value="Chuyển đổi giao diện Sáng Tối Theme" onSelect={handleToggleTheme} className="cursor-pointer">
            {theme === "dark" ? (
              <Sun className="mr-2 size-4 text-muted-foreground" />
            ) : (
              <Moon className="mr-2 size-4 text-muted-foreground" />
            )}
            <span>
              {theme === "dark"
                ? t("command_palette.light_mode")
                : t("command_palette.dark_mode")}
            </span>
          </CommandItem>

          <CommandItem value="Đổi ngôn ngữ Language Tiếng Việt English" onSelect={handleToggleLocale} className="cursor-pointer">
            <Globe className="mr-2 size-4 text-muted-foreground" />
            <span>{t("command_palette.switch_language")}</span>
          </CommandItem>
        </CommandGroup>

        {user?.tenantMemberships && user.tenantMemberships.length > 1 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("navigation.tenant.switch")}>
              {user.tenantMemberships.map((tenant) => (
                <CommandItem
                  key={tenant.tenantId}
                  value={`Workspace Tenant ${tenant.tenantName}`}
                  onSelect={() => {
                    onOpenChange(false)
                    void switchTenant(tenant.tenantId)
                  }}
                  className="cursor-pointer"
                >
                  <Building2 className="mr-2 size-4 text-muted-foreground" />
                  <span className="flex-1">{tenant.tenantName}</span>
                  {tenant.tenantId === (user.activeTenantId || user.tenantId) ? (
                    <span className="text-[11px] font-semibold text-primary">
                      ✓
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />

        <CommandGroup heading={t("navigation.profile.title")}>
          <CommandItem value="Đăng xuất Logout" onSelect={handleLogout} className="cursor-pointer text-destructive">
            <LogOut className="mr-2 size-4" />
            <span>{t("action.logout")}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
