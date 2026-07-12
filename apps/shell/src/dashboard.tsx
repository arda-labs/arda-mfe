import { useSystemBranding } from "@workspace/core/branding"

export function Dashboard() {
  const { branding } = useSystemBranding()
  return (
    <div className="overflow-y-auto p-4 md:p-6">
      <section className="flex max-w-2xl flex-col gap-4">
        <p className="text-sm text-muted-foreground">Shell</p>
        <h1 className="text-3xl font-semibold text-balance">
          {branding.appName} workspace
        </h1>
        <p className="text-pretty text-muted-foreground">
          Auth, layout, i18n, theme, and notifications live in the shell.
          Domain pages load as runtime micro frontends.
        </p>
      </section>
    </div>
  )
}
