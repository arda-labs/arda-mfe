import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { api } from "@workspace/api"
import type { ApiSuccess } from "@workspace/api"
import type { ListResponse } from "@workspace/api/list"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { usersApi } from "../api"
import type { User } from "../types"

interface Organization {
  id: string
  code: string
  name: string
}

/** Data-scope (org) assignment for one user (W6a). */
export function UserScopeDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)
    void (async () => {
      try {
        const [orgsResponse, assigned] = await Promise.all([
          api.get<ApiSuccess<ListResponse<Organization>>>(
            "/api/platform/organizations?all=true"
          ),
          usersApi.listOrganizations(user.id),
        ])
        if (cancelled) return
        setOrganizations(orgsResponse.result.items)
        setSelected(new Set(assigned))
      } catch {
        if (!cancelled) setLoadFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, user])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    if (!user) return
    setPending(true)
    try {
      await usersApi.setOrganizations(user.id, [...selected])
      notify.success(t("admin.users.scope.save_success"))
      onOpenChange(false)
    } catch {
      notify.error(t("admin.users.scope.save_failed"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.users.scope.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.users.scope.description", { name: user?.email ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[320px] space-y-2 overflow-auto">
          {loading && (
            <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
          )}
          {!loading && loadFailed && (
            <div className="text-sm text-destructive">
              {t("admin.users.scope.load_failed")}
            </div>
          )}
          {!loading && !loadFailed && organizations.length === 0 && (
            <div className="text-sm text-muted-foreground">{t("admin.users.scope.empty")}</div>
          )}
          {!loading &&
            !loadFailed &&
            organizations.map((org) => (
              <label key={org.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(org.id)}
                  onChange={() => toggle(org.id)}
                />
                <span className="font-mono text-xs">{org.code}</span>
                <span className="font-medium">{org.name}</span>
              </label>
            ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={pending || loading || loadFailed}>
            {t("common.action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
