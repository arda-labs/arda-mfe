import { getMediaContentUrl } from "@workspace/media/urls"
import { apiUrl } from "@workspace/api/url"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { AuthShellLoadingScreen } from "./loading-screen"
import { useAuthStore } from "./store"

type Organization = {
  id: string
  code?: string
  name: string
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, logout, updateUser } = useAuthStore()
  const [availableOrgs, setAvailableOrgs] = useState<Organization[] | null>(
    null
  )

  useEffect(() => {
    if (!isAuthenticated || !user?.orgIds) return
    if (user.orgIds.length === 1 && !user.activeOrgId) {
      updateUser({ activeOrgId: user.orgIds[0] })
      return
    }
    if (user.orgIds.length > 1 && !user.activeOrgId && availableOrgs === null) {
      fetch(apiUrl("/api/platform/organizations"), { credentials: "include" })
        .then((res) => (res.ok ? res.json() : []))
        .then((orgList: Organization[]) => {
          setAvailableOrgs(
            orgList.filter((org) => user.orgIds?.includes(org.id))
          )
        })
        .catch(() => setAvailableOrgs([]))
    }
  }, [availableOrgs, isAuthenticated, updateUser, user])

  useEffect(() => {
    if (!isAuthenticated || !user?.avatarFileId) return
    const contentURL = getMediaContentUrl(user.avatarFileId)
    if (user.picture !== contentURL) updateUser({ picture: contentURL })
  }, [isAuthenticated, updateUser, user?.avatarFileId, user?.picture])

  if (!isAuthenticated) return <AuthShellLoadingScreen />

  if (user?.orgIds && user.orgIds.length > 1 && !user.activeOrgId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-dialog">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <h2 className="text-xl font-bold text-balance">
              Chọn đơn vị làm việc
            </h2>
            <p className="text-xs text-pretty text-muted-foreground">
              Tài khoản của bạn thuộc nhiều đơn vị. Vui lòng chọn một đơn vị để
              bắt đầu phiên làm việc.
            </p>
          </div>

          <div className="space-y-3">
            {availableOrgs === null ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-xs text-muted-foreground">
                <div className="size-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                <span>Đang tải danh sách đơn vị...</span>
              </div>
            ) : availableOrgs.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Không tìm thấy thông tin đơn vị được gán.
              </div>
            ) : (
              availableOrgs.map((org) => (
                <button
                  className="group flex w-full cursor-pointer items-center justify-between rounded-md border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                  key={org.id}
                  onClick={() => updateUser({ activeOrgId: org.id })}
                >
                  <span className="flex items-center gap-3">
                    <Building2 className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span>
                      <span className="block text-sm font-semibold">
                        {org.name}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {org.code}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="pt-2 text-center">
            <Button variant="link" size="sm" onClick={() => logout()}>
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
