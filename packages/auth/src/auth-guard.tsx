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
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/callback")) {
          window.history.pushState(null, "", "/login")
          window.dispatchEvent(new PopStateEvent("popstate"))
        }
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
      <div className="flex min-h-screen items-center justify-center bg-radial from-background via-muted/50 to-muted p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border bg-background/70 backdrop-blur-md p-6 shadow-2xl transition-all">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary animate-pulse">
              <Building2 className="size-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Chọn đơn vị làm việc</h2>
            <p className="text-xs text-muted-foreground">
              Tài khoản của bạn thuộc nhiều đơn vị. Vui lòng chọn một đơn vị để bắt đầu phiên làm việc.
            </p>
          </div>

          <div className="space-y-3">
            {availableOrgs === null ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
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
                  className="group flex w-full cursor-pointer items-center justify-between rounded-xl border bg-background/50 p-4 text-left transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm"
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

          <div className="text-center pt-2">
            <button
              className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground transition-colors"
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4 py-6 text-foreground transition-colors duration-500" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center gap-6 py-6 text-center">
        <div className="relative flex size-16 items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20 animate-pulse">
            A
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/10" />
          <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-primary animate-spin" />
        </div>
        
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight">Arda Secure Session</h1>
          <p className="text-xs leading-relaxed text-muted-foreground max-w-xs mx-auto">Checking authorization status...</p>
        </div>
      </div>
    </main>
  )
}
