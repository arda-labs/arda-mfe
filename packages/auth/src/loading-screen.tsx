import { useSystemBranding } from "@workspace/core/branding"
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
