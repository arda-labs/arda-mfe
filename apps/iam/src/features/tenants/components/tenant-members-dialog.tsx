import { useCallback, useEffect, useState } from "react"
import type { Tenant, TenantMember } from "../types"
import { tenantsApi } from "../api"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Trash2 } from "lucide-react"

type TenantMembersDialogProps = {
  tenant: Tenant | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after membership changes so the page can refresh its server list. */
  onChanged?: () => void | Promise<void>
}

function memberLabel(member: TenantMember) {
  return member.displayName || member.username || member.email || "-"
}

export function TenantMembersDialog({
  tenant,
  open,
  onOpenChange,
  onChanged,
}: TenantMembersDialogProps) {
  const { t } = useI18n()
  const [members, setMembers] = useState<TenantMember[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState(false)
  const [userId, setUserId] = useState("")
  const tenantId = tenant?.id

  const loadMembers = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const nextMembers = await tenantsApi.listTenantMembers(tenantId)
      setMembers(nextMembers)
    } catch (err) {
      notify.error(
        t("iam.tenants.members.load_failed"),
        translateApiError(err)
      )
    } finally {
      setLoading(false)
    }
  }, [tenantId, t])

  useEffect(() => {
    if (!open || !tenantId) {
      if (!open) {
        setMembers([])
        setUserId("")
      }
      return
    }
    void loadMembers()
  }, [open, tenantId, loadMembers])

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
  }

  const handleAdd = async () => {
    const trimmed = userId.trim()
    if (!tenantId || !trimmed) {
      notify.error(t("iam.tenants.members.missing_info"), t("iam.tenants.members.user_id_required"))
      return
    }
    setActing(true)
    try {
      await tenantsApi.addTenantMember(tenantId, trimmed)
      setUserId("")
      notify.success(t("iam.tenants.members.add_success"))
      await loadMembers()
      await onChanged?.()
    } catch (err) {
      notify.error(t("iam.tenants.members.add_failed"), translateApiError(err))
    } finally {
      setActing(false)
    }
  }

  const handleRemove = async (memberUserId: string) => {
    if (!tenantId) return
    setActing(true)
    try {
      await tenantsApi.removeTenantMember(tenantId, memberUserId)
      notify.success(t("iam.tenants.members.remove_success"))
      await loadMembers()
      await onChanged?.()
    } catch (err) {
      notify.error(
        t("iam.tenants.members.remove_failed"),
        translateApiError(err)
      )
    } finally {
      setActing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {t("iam.tenants.members.title", {
              tenant: tenant?.name || tenant?.code || "",
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex-1 space-y-2 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                {t("common.loading")}
              </p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("iam.tenants.members.empty")}
              </p>
            ) : (
              <div className="divide-y rounded-md border">
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {memberLabel(member)}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {member.username ? `${member.username} · ` : ""}
                        {member.email || "-"}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {member.userId}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
                      disabled={acting}
                      onClick={() => void handleRemove(member.userId)}
                      title={t("common.action.delete")}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t pt-3">
            <Input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder={t("iam.tenants.members.user_id_placeholder")}
              aria-label={t("iam.tenants.members.user_id_placeholder")}
            />
            <Button disabled={acting} onClick={() => void handleAdd()}>
              {t("iam.tenants.members.add")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
