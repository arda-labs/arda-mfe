import { lazy, Suspense, useEffect, useState } from "react"
import { CallbackPage, ConsentPage, LoginPage } from "../../../packages/auth/src/pages"

const WorkspaceApp = lazy(() => import("./WorkspaceApp"))

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    const syncPathname = () => setPathname(window.location.pathname)
    window.addEventListener("popstate", syncPathname)
    return () => window.removeEventListener("popstate", syncPathname)
  }, [])

  return pathname
}

export function App() {
  const pathname = usePathname()
  if (pathname === "/auth") return <LoginPage />
  if (pathname === "/login") return <LoginPage />
  if (pathname === "/callback" || pathname === "/login-callback") return <CallbackPage />
  if (pathname === "/consent") return <ConsentPage />

  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <WorkspaceApp pathname={pathname} />
    </Suspense>
  )
}

function WorkspaceLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-6 text-foreground" style={{ minHeight: "100dvh" }}>
      <div className="w-full max-w-md rounded-lg border bg-background p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          A
        </div>
        <h1 className="text-xl font-semibold">Preparing Arda</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Loading workspace...</p>
        <div className="mx-auto mt-5 size-7 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    </main>
  )
}
