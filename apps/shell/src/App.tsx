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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4 py-6 text-foreground transition-colors duration-500" style={{ minHeight: "100dvh" }}>
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
        {/* Glow effect */}
        <div className="absolute -left-10 -top-10 size-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-10 -bottom-10 size-40 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 animate-bounce">
            A
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Preparing Arda</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Loading workspace...</p>
          
          <div className="relative mx-auto mt-8 flex size-8 items-center justify-center">
            <div className="absolute size-full rounded-full border-4 border-primary/10" />
            <div className="absolute size-full rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
        </div>
      </div>
    </main>
  )
}
