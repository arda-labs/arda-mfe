import { Check, ChevronsUpDown, Network } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { useAuthStore, useOrganizationOptions } from "@workspace/auth"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export function SidebarOrgSwitcher({
  compact = false,
}: {
  compact?: boolean
}) {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const setActiveOrgId = useAuthStore((state) => state.setActiveOrgId)
  const orgIds = user?.orgIds ?? []
  const activeOrgId = user?.activeOrgId || orgIds[0] || ""
  const { organizations } = useOrganizationOptions(orgIds, orgIds.length > 1)
  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrgId
  )

  if (orgIds.length <= 1) return null

  const handleSelect = (orgId: string) => {
    if (orgId === activeOrgId) return
    setActiveOrgId(orgId)
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title={t("auth.org_select.branch_label")}
            aria-label={t("auth.org_select.branch_label")}
          >
            <Network className="size-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left"
            title={t("auth.org_select.branch_label")}
          >
            <Network className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-xs">
              {activeOrganization?.name ||
                activeOrgId ||
                t("auth.org_select.branch_placeholder")}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={compact ? "right" : "bottom"}
        className="w-64"
      >
        <DropdownMenuLabel>
          {t("auth.org_select.branch_label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((organization) => (
          <DropdownMenuItem
            key={organization.id}
            className="gap-2"
            onSelect={() => handleSelect(organization.id)}
          >
            <span className="min-w-0 flex-1 truncate">
              {organization.name}
            </span>
            {organization.code ? (
              <span className="font-mono text-[10px] text-muted-foreground">
                {organization.code}
              </span>
            ) : null}
            {organization.id === activeOrgId ? (
              <Check className="size-4 shrink-0" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
