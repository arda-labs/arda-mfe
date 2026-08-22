import { useSystemBranding } from "@workspace/theme/branding"
import { BrandMark } from "@workspace/ui/components/brand-mark"
import { Spinner } from "@workspace/ui/components/spinner"

type AuthLoadingScreenProps = {
  fullscreen?: boolean
  label?: string
}

export function AuthLoadingScreen({
  fullscreen = true,
  label = "Đang xác thực...",
}: AuthLoadingScreenProps) {
  const { branding } = useSystemBranding()
  const content = (
    <div className="flex flex-col items-center gap-6 text-center">
      <BrandMark
        name={branding.appName}
        logoUrl={branding.loginLogoUrl || branding.dashboardLogoUrl}
        size="lg"
      />
      <div className="flex flex-col items-center gap-2">
        <Spinner className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )

  if (!fullscreen) {
    return (
      <div className="flex min-h-48 items-center justify-center text-foreground">
        {content}
      </div>
    )
  }

  const bgColor = "bg-background"
  return (
    <main
      className={`flex min-h-dvh items-center justify-center ${bgColor} px-4`}
    >
      <div className="w-full max-w-sm rounded-xl border bg-card px-6 py-10 shadow-sm sm:px-8">
        {content}
      </div>
    </main>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-muted motion-reduce:animate-none ${className}`}
    />
  )
}

export function AuthShellLoadingScreen() {
  const { branding } = useSystemBranding()

  return (
    <main
      aria-busy="true"
      aria-label="Đang chuẩn bị phiên làm việc"
      className="flex min-h-dvh overflow-hidden bg-background text-foreground"
    >
      <span className="sr-only" role="status" aria-live="polite">
        Đang chuẩn bị phiên làm việc...
      </span>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card sm:flex">
        <div className="flex h-[52px] items-center gap-3 border-b border-border px-3">
          <BrandMark
            name={branding.appName}
            logoUrl={branding.dashboardLogoUrl || branding.loginLogoUrl}
            size="sm"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className="h-3.5 w-28" />
            <SkeletonBlock className="h-2.5 w-20" />
          </div>
        </div>
        <div className="flex-1 space-y-2 p-2">
          <SkeletonBlock className="h-9 w-full" />
          <SkeletonBlock className="h-9 w-10/12" />
          <SkeletonBlock className="h-9 w-full" />
          <SkeletonBlock className="h-9 w-9/12" />
          <SkeletonBlock className="h-9 w-11/12" />
        </div>
        <div className="h-[52px] border-t border-border" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <SkeletonBlock className="h-4 w-28 sm:w-40" />
          <div className="flex items-center gap-2">
            <SkeletonBlock className="size-8 rounded-full" />
            <SkeletonBlock className="hidden size-8 rounded-full sm:block" />
            <SkeletonBlock className="size-8 rounded-full" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6">
          <div className="mx-auto flex h-full max-w-screen-2xl flex-col gap-5">
            <div className="space-y-2">
              <SkeletonBlock className="h-6 w-44" />
              <SkeletonBlock className="h-3 w-64 max-w-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="space-y-4 rounded-lg border border-border bg-card p-4"
                >
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="h-7 w-20" />
                </div>
              ))}
            </div>
            <div className="min-h-0 flex-1 space-y-4 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-8 w-24" />
              </div>
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-10 w-full" />
              <SkeletonBlock className="h-10 w-10/12" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
