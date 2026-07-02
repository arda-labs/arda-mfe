import { getMediaContentUrl } from "@workspace/core/media/urls"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { Building2 } from "lucide-react"
import { normalizeAuthUser, useAuthStore } from "./store"

type Organization = {
  id: string
  code?: string
  name: string
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, login, logout, updateUser } = useAuthStore()
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated())
  const hasRedirected = useRef(false)
  const [availableOrgs, setAvailableOrgs] = useState<Organization[] | null>(null)

  useEffect(() => {
    if (hydrated) return
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true))
  }, [hydrated])

  useEffect(() => {
    if (!hydrated || hasRedirected.current || isAuthenticated) return
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error("session expired")
      })
      .then((userData) => login(normalizeAuthUser(userData, getMediaContentUrl)))
      .catch(() => {
        logout()
        hasRedirected.current = true
        window.location.href = "/login"
      })
  }, [hydrated, isAuthenticated, login, logout])

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user?.orgIds) return
    if (user.orgIds.length === 1 && !user.activeOrgId) {
      updateUser({ activeOrgId: user.orgIds[0] })
      return
    }
    if (
      user.orgIds.length > 1 &&
      !user.activeOrgId &&
      availableOrgs === null
    ) {
      fetch("/api/platform/organizations", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : []))
        .then((orgList: Organization[]) => {
          setAvailableOrgs(orgList.filter((org) => user.orgIds?.includes(org.id)))
        })
        .catch(() => setAvailableOrgs([]))
    }
  }, [availableOrgs, hydrated, isAuthenticated, updateUser, user])

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user?.avatarFileId) return
    const contentURL = getMediaContentUrl(user.avatarFileId)
    if (user.picture !== contentURL) updateUser({ picture: contentURL })
  }, [hydrated, isAuthenticated, updateUser, user?.avatarFileId, user?.picture])

  if (!hydrated || !isAuthenticated) return <AuthGuardFallback />

  if (user?.orgIds && user.orgIds.length > 1 && !user.activeOrgId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border bg-background p-6 shadow-xl">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="size-6" />
            </div>
            <h2 className="text-xl font-bold">Chọn đơn vị làm việc</h2>
            <p className="text-xs text-muted-foreground">
              Tài khoản của bạn thuộc nhiều đơn vị. Vui lòng chọn một đơn vị để
              bắt đầu phiên làm việc.
            </p>
          </div>

          <div className="space-y-3">
            {availableOrgs === null ? (
              <div className="animate-pulse py-6 text-center text-xs text-muted-foreground">
                Đang tải danh sách đơn vị...
              </div>
            ) : availableOrgs.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Không tìm thấy thông tin đơn vị được gán.
              </div>
            ) : (
              availableOrgs.map((org) => (
                <button
                  className="group flex w-full cursor-pointer items-center justify-between rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                  key={org.id}
                  onClick={() => updateUser({ activeOrgId: org.id })}
                >
                  <span className="flex items-center gap-3">
                    <Building2 className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                    <span>
                      <span className="block text-sm font-semibold">{org.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {org.code}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="text-center">
            <button
              className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => logout()}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function AuthGuardFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-6 text-foreground" style={{ minHeight: "100dvh" }}>
      <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          A
        </div>
        <h1 className="text-xl font-semibold">Preparing Arda</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Checking your secure session...</p>
        <div className="mx-auto mt-5 size-7 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    </main>
  )
}
