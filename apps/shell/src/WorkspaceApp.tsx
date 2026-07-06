import { useSystemBranding } from "@workspace/core/branding"
import { lazy, Suspense, type ComponentType } from "react"
import * as authShare from "../../../packages/auth/src/index"
import * as authStoreShare from "../../../packages/auth/src/store"
import * as stepUpChannelShare from "../../../packages/auth/src/step-up-channel"
import * as notificationsShare from "../../../packages/notifications/src/index"
import * as themeShare from "../../../packages/theme/src/index"
import { BadGatewayPage, NotFoundPage } from "./features/errors/page"
import { ShellLayout } from "./ShellLayout"

const mfCache = ((
  globalThis as typeof globalThis & {
    __mf_module_cache__?: {
      share: Record<string, unknown>
      remote: Record<string, unknown>
    }
  }
).__mf_module_cache__ ??= { share: {}, remote: {} })

// ponytail: Workspace-only seeding keeps auth routes light; remove when federation exposes local singletons lazily.
mfCache.share["default:@workspace/auth"] ??= authShare
mfCache.share["@workspace/auth"] ??= authShare
mfCache.share["default:@workspace/auth/store"] ??= authStoreShare
mfCache.share["@workspace/auth/store"] ??= authStoreShare
mfCache.share["default:@workspace/auth/step-up-channel"] ??= stepUpChannelShare
mfCache.share["@workspace/auth/step-up-channel"] ??= stepUpChannelShare
mfCache.share["default:@workspace/theme"] ??= themeShare
mfCache.share["@workspace/theme"] ??= themeShare
mfCache.share["default:@workspace/notifications"] ??= notificationsShare
mfCache.share["@workspace/notifications"] ??= notificationsShare

type RemoteModule = {
  default?: ComponentType
  [key: string]: unknown
}

function lazyRemote(load: () => Promise<RemoteModule>) {
  return lazy(async () => {
    const mod = await load()
    const component =
      mod.default ??
      Object.values(mod).find((value) => typeof value === "function")
    if (!component)
      throw new Error("Remote module did not expose a React component")
    return { default: component as ComponentType }
  })
}

const IamRoutes = lazyRemote(() => import("iam/Routes"))
const PlatformRoutes = lazyRemote(() => import("platform/Routes"))
const FinanceRoutes = lazyRemote(() => import("finance/Routes"))
const HrmRoutes = lazyRemote(() => import("hrm/Routes"))
const AccountRoutes = lazyRemote(() => import("account/Routes"))
const CrmRoutes = lazyRemote(() => import("crm/Routes"))
const WorkflowRoutes = lazyRemote(() => import("workflow/Routes"))

const routeFallback = <authShare.AuthLoadingScreen fullscreen={false} />

type WorkspaceAppProps = {
  pathname: string
}

function navigate(pathname: string) {
  window.history.pushState({}, "", pathname)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

type WorkspaceRoute =
  | "dashboard"
  | "iam"
  | "platform"
  | "finance"
  | "hrm"
  | "account"
  | "crm"
  | "workflow"
  | "not-found"
  | "bad-gateway"

function resolveWorkspaceRoute(pathname: string): WorkspaceRoute {
  if (pathname === "/404") return "not-found"
  if (pathname === "/502") return "bad-gateway"

  if (
    pathname === "/iam" ||
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/groups") ||
    pathname.startsWith("/admin/roles") ||
    pathname.startsWith("/admin/permissions") ||
    pathname.startsWith("/admin/audit") ||
    pathname.startsWith("/admin/settings")
  ) {
    return "iam"
  }

  if (
    pathname.startsWith("/admin/organizations") ||
    pathname.startsWith("/admin/parameters") ||
    pathname.startsWith("/admin/provinces") ||
    pathname.startsWith("/admin/wards") ||
    pathname.startsWith("/admin/lookups") ||
    pathname.startsWith("/admin/area-types") ||
    pathname.startsWith("/admin/areas") ||
    pathname.startsWith("/admin/credit-institutions") ||
    pathname.startsWith("/admin/templates") ||
    pathname.startsWith("/admin/calendar") ||
    pathname.startsWith("/admin/cutoff")
  ) {
    return "platform"
  }

  if (pathname.startsWith("/finance/")) return "finance"
  if (pathname === "/hrm" || pathname.startsWith("/hrm/")) return "hrm"
  if (
    pathname.startsWith("/customers/") ||
    pathname.startsWith("/workbench/")
  ) {
    return "crm"
  }
  if (pathname.startsWith("/workflow/")) return "workflow"
  if (
    pathname === "/my-account" ||
    pathname.startsWith("/my-account/") ||
    pathname.startsWith("/settings/appearance") ||
    pathname.startsWith("/in/")
  ) {
    return "account"
  }
  if (pathname === "/") return "dashboard"

  return "not-found"
}

export default function WorkspaceApp({ pathname }: WorkspaceAppProps) {
  const route = resolveWorkspaceRoute(pathname)

  return (
    <authShare.StepUpProvider>
      <authShare.AuthGuard>
        <ShellLayout pathname={pathname} navigate={navigate}>
          {route === "iam" ? (
            <Suspense fallback={routeFallback}>
              <IamRoutes />
            </Suspense>
          ) : route === "platform" ? (
            <Suspense fallback={routeFallback}>
              <PlatformRoutes />
            </Suspense>
          ) : route === "finance" ? (
            <Suspense fallback={routeFallback}>
              <FinanceRoutes />
            </Suspense>
          ) : route === "hrm" ? (
            <Suspense fallback={routeFallback}>
              <HrmRoutes />
            </Suspense>
          ) : route === "crm" ? (
            <Suspense fallback={routeFallback}>
              <CrmRoutes />
            </Suspense>
          ) : route === "workflow" ? (
            <Suspense fallback={routeFallback}>
              <WorkflowRoutes />
            </Suspense>
          ) : route === "account" ? (
            <Suspense fallback={routeFallback}>
              <AccountRoutes />
            </Suspense>
          ) : route === "bad-gateway" ? (
            <BadGatewayPage />
          ) : route === "dashboard" ? (
            <Dashboard />
          ) : (
            <NotFoundPage />
          )}
        </ShellLayout>
      </authShare.AuthGuard>
    </authShare.StepUpProvider>
  )
}

function Dashboard() {
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
