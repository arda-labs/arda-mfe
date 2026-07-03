import { useSystemBranding } from "@workspace/core/branding"
import { BrandMark } from "@workspace/ui/components/brand-mark"

type AuthLoadingScreenProps = {
  fullscreen?: boolean
  label?: string
}

export function AuthLoadingScreen({
  fullscreen = true,
  label = "Securing workspace...",
}: AuthLoadingScreenProps) {
  const { branding } = useSystemBranding()
  const content = (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <BrandMark
        name={branding.appName}
        logoUrl={branding.loginLogoUrl || branding.dashboardLogoUrl}
        size="lg"
      />

      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold text-balance">
          {branding.appName} Secure Session
        </h1>
        <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  )

  if (!fullscreen) {
    return (
      <div className="flex min-h-64 items-center justify-center px-4 py-8 text-foreground">
        {content}
      </div>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-6 text-foreground">
      {content}
    </main>
  )
}
