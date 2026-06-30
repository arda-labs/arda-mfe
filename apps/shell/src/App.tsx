import { lazy, Suspense, useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"

const IamRoutes = lazy(() => import("iam/Routes"))

function navigate(pathname: string) {
  window.history.pushState({}, "", pathname)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

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
  const isIam = pathname.startsWith("/iam")

  return (
    <div className="bg-background text-foreground min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <button
            className="font-semibold"
            type="button"
            onClick={() => navigate("/")}
          >
            Arda
          </button>
          <nav className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isIam ? "default" : "ghost"}
              onClick={() => navigate("/iam")}
            >
              IAM
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {isIam ? (
          <Suspense fallback={<div className="text-sm">Loading IAM...</div>}>
            <IamRoutes />
          </Suspense>
        ) : (
          <section className="flex max-w-2xl flex-col gap-4">
            <p className="text-muted-foreground text-sm">Shell</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Arda micro frontend shell
            </h1>
            <p className="text-muted-foreground">
              The shell owns auth, layout, and top-level navigation. Business
              domains are loaded as runtime remotes.
            </p>
            <div>
              <Button onClick={() => navigate("/iam")}>Open IAM remote</Button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
