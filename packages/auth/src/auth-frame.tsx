import type { ReactNode } from "react"
import { CheckCircle2, ShieldCheck } from "lucide-react"

import { useI18n } from "@workspace/i18n"
import { BrandMark } from "@workspace/ui/components/brand-mark"
import { cn } from "@workspace/ui/lib/utils"
import type { BrandingSettings } from "@workspace/theme/branding"

type AuthFrameProps = {
  branding: BrandingSettings
  children: ReactNode
}

/**
 * Shared shell for every anonymous auth screen (login, recovery, loading).
 * Renders the branding settings from /admin/settings: a brand panel on the
 * left (login background / welcome copy when enabled) and the form on the
 * right. Falls back to a plain centered card below `lg`.
 */
export function AuthFrame({ branding, children }: AuthFrameProps) {
  const logoUrl = branding.loginLogoUrl || branding.dashboardLogoUrl
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-6 text-foreground sm:px-6">
      <div className="w-full max-w-5xl">
        <div className="grid w-full overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-12">
          <AuthBrandPanel branding={branding} />
          <div className="flex flex-col justify-center bg-card p-5 sm:p-8 lg:col-span-7 lg:px-12 lg:py-14">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <BrandMark name={branding.appName} logoUrl={logoUrl} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {branding.appName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <WorkspaceLabel branding={branding} />
                </p>
              </div>
            </div>
            <div className="mx-auto w-full max-w-sm">{children}</div>
          </div>
        </div>
        <AuthFooter branding={branding} />
      </div>
    </main>
  )
}

function WorkspaceLabel({ branding }: { branding: BrandingSettings }) {
  const { t } = useI18n()
  return <>{branding.organizationName || t("auth.login.secure_workspace")}</>
}

function AuthBrandPanel({ branding }: { branding: BrandingSettings }) {
  const { t } = useI18n()
  const logoUrl = branding.loginLogoUrl || branding.dashboardLogoUrl
  const hasBackground = Boolean(
    branding.loginBackgroundEnabled && branding.loginBackgroundUrl
  )
  const bullets = [
    t("auth.login.brand.bullet_sso"),
    t("auth.login.brand.bullet_sessions"),
    t("auth.login.brand.bullet_mfa"),
  ]
  return (
    <div
      className={cn(
        "relative hidden min-h-[560px] flex-col justify-between gap-10 overflow-hidden p-8 lg:col-span-5 lg:flex lg:border-r",
        !hasBackground &&
          "bg-gradient-to-br from-primary/15 via-muted/70 to-background"
      )}
      style={
        hasBackground
          ? {
              backgroundImage: `linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0.28)), url("${escapeCssUrl(
                branding.loginBackgroundUrl
              )}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
              color: "white",
            }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <BrandMark name={branding.appName} logoUrl={logoUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{branding.appName}</p>
          <p
            className={cn(
              "truncate text-xs",
              hasBackground ? "text-white/75" : "text-muted-foreground"
            )}
          >
            <WorkspaceLabel branding={branding} />
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
            hasBackground
              ? "border-white/30 bg-black/25 text-white"
              : "border-primary/20 bg-background/70 text-foreground"
          )}
        >
          <ShieldCheck
            className={cn("size-4", hasBackground ? "text-white" : "text-primary")}
          />
          <span>{t("auth.login.brand.badge")}</span>
        </div>
        <h2 className="text-3xl leading-tight font-semibold text-balance">
          {branding.loginWelcomeTitle}
        </h2>
        <p
          className={cn(
            "text-sm leading-6 text-pretty",
            hasBackground ? "text-white/85" : "text-muted-foreground"
          )}
        >
          {branding.loginWelcomeSubtitle}
        </p>
      </div>

      <ul
        className={cn(
          "space-y-2.5 text-xs",
          hasBackground ? "text-white/80" : "text-muted-foreground"
        )}
      >
        {bullets.map((label) => (
          <li key={label} className="flex items-center gap-2.5">
            <CheckCircle2
              className={cn(
                "size-4 shrink-0",
                hasBackground ? "text-white" : "text-primary"
              )}
            />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AuthFooter({ branding }: { branding: BrandingSettings }) {
  const { t } = useI18n()
  const supportEmail = branding.supportEmail.trim()
  const supportPhone = branding.supportPhone.trim()
  const helpUrl = getSafeLinkUrl(branding.helpUrl)
  return (
    <div className="mt-6 flex flex-col items-center gap-1.5 text-center text-xs text-muted-foreground">
      <p>
        &copy; {new Date().getFullYear()}{" "}
        {branding.organizationName || branding.appName}.{" "}
        {t("auth.login.footer.rights")}
      </p>
      {(supportEmail || supportPhone || helpUrl) && (
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {supportEmail ? (
            <a
              className="transition-colors hover:text-foreground hover:underline"
              href={`mailto:${supportEmail}`}
            >
              {supportEmail}
            </a>
          ) : null}
          {supportPhone ? (
            <a
              className="transition-colors hover:text-foreground hover:underline"
              href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`}
            >
              {supportPhone}
            </a>
          ) : null}
          {helpUrl ? (
            <a
              className="transition-colors hover:text-foreground hover:underline"
              href={helpUrl}
              rel="noreferrer"
              target="_blank"
            >
              {t("auth.login.footer.help")}
            </a>
          ) : null}
        </p>
      )}
    </div>
  )
}

function escapeCssUrl(value: string) {
  return value.replace(/["\\]/g, "\\$&")
}

function getSafeLinkUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  try {
    const url = new URL(trimmed)
    return url.protocol === "https:" || url.protocol === "http:" ? trimmed : ""
  } catch {
    return ""
  }
}
