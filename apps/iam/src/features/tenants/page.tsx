import { useCallback, useEffect, useState } from "react"
import type { Tenant, TenantMember } from "./types"
import { tenantsApi } from "./api"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Building2, RefreshCw } from "lucide-react"

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [members, setMembers] = useState<Record<string, TenantMember[]>>({})
  const [memberUserIds, setMemberUserIds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")

  const loadTenants = useCallback(async () => {
    setLoading(true)
    try {
      const nextTenants = await tenantsApi.listTenants()
      setTenants(nextTenants)
      const entries = await Promise.all(
        nextTenants.map(async (tenant) => [
          tenant.id,
          await tenantsApi.listTenantMembers(tenant.id),
        ] as const)
      )
      setMembers(Object.fromEntries(entries))
    } catch (error) {
      notify.error("Không tải được tenant", translateApiError(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const addMember = async (tenantId: string) => {
    const userId = memberUserIds[tenantId]?.trim()
    if (!userId) {
      notify.error("Thiếu thông tin", "Cần nhập user ID")
      return
    }
    try {
      await tenantsApi.addTenantMember(tenantId, userId)
      setMemberUserIds((current) => ({ ...current, [tenantId]: "" }))
      notify.success("Đã thêm thành viên")
      await loadTenants()
    } catch (error) {
      notify.error("Không thêm được thành viên", translateApiError(error))
    }
  }

  const removeMember = async (tenantId: string, userId: string) => {
    try {
      await tenantsApi.removeTenantMember(tenantId, userId)
      notify.success("Đã gỡ thành viên")
      await loadTenants()
    } catch (error) {
      notify.error("Không gỡ được thành viên", translateApiError(error))
    }
  }

  useEffect(() => {
    void loadTenants()
  }, [loadTenants])

  const createTenant = async () => {
    const normalizedCode = code.trim().toLowerCase()
    const normalizedName = name.trim()
    if (!normalizedCode || !normalizedName) {
      notify.error("Thiếu thông tin", "Cần nhập tenant code và tên tenant")
      return
    }
    setSaving(true)
    try {
      await tenantsApi.createTenant({ code: normalizedCode, name: normalizedName })
      setCode("")
      setName("")
      notify.success("Đã tạo tenant")
      await loadTenants()
    } catch (error) {
      notify.error("Không tạo được tenant", translateApiError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý business tenant và registry context cho toàn hệ thống.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tạo tenant</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="tenant-code"
            aria-label="Tenant code"
          />
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tenant name"
            aria-label="Tenant name"
          />
          <Button disabled={saving} onClick={() => void createTenant()}>
            Tạo tenant
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Tenant registry</CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={loading}
            onClick={() => void loadTenants()}
            aria-label="Refresh tenants"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có tenant.</p>
          ) : (
            <div className="divide-y rounded-md border">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="space-y-3 px-3 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Building2 className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {tenant.code} · {tenant.id}
                      </div>
                    </div>
                    <Badge variant="secondary">{tenant.status}</Badge>
                  </div>
                  <div className="ml-7 space-y-2 rounded-md bg-muted/30 p-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Members ({members[tenant.id]?.length || 0})
                    </div>
                    {members[tenant.id]?.map((member) => (
                      <div key={member.userId} className="flex items-center gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate">
                          {member.displayName || member.username || member.email}
                          <span className="ml-2 font-mono text-muted-foreground">
                            {member.userId}
                          </span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void removeMember(tenant.id, member.userId)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={memberUserIds[tenant.id] || ""}
                        onChange={(event) =>
                          setMemberUserIds((current) => ({
                            ...current,
                            [tenant.id]: event.target.value,
                          }))
                        }
                        placeholder="IAM user ID"
                        aria-label={`Add member to ${tenant.name}`}
                      />
                      <Button onClick={() => void addMember(tenant.id)}>Add</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
