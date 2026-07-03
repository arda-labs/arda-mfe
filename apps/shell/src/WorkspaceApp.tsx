import { useSystemBranding } from "@workspace/core/branding"
import { lazy, Suspense, type ComponentType } from "react"
import * as authShare from "../../../packages/auth/src/index"
import * as authStoreShare from "../../../packages/auth/src/store"
import * as stepUpChannelShare from "../../../packages/auth/src/step-up-channel"
import * as themeShare from "../../../packages/theme/src/index"
import { CustomersPage } from "./features/customers/page"
import { WorkbenchPage } from "./features/workbench/page"
import { WorkflowAdminPage } from "./features/workflow/page"
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
const AccountRoutes = lazyRemote(() => import("account/Routes"))

const routeFallback = <authShare.AuthLoadingScreen fullscreen={false} />

type WorkspaceAppProps = {
  pathname: string
}

function navigate(pathname: string) {
  window.history.pushState({}, "", pathname)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

export default function WorkspaceApp({ pathname }: WorkspaceAppProps) {
  const isIam =
    pathname === "/iam" ||
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/roles") ||
    pathname.startsWith("/admin/permissions") ||
    pathname.startsWith("/admin/audit") ||
    pathname.startsWith("/admin/settings")
  const isPlatform =
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
  const isFinance =
    pathname.startsWith("/finance/")
  const isCustomerOperation = pathname.startsWith("/customers/")
  const isWorkbench = pathname.startsWith("/workbench/")
  const isWorkflowAdmin = pathname.startsWith("/workflow/")
  const isAccount =
    pathname === "/my-account" ||
    pathname.startsWith("/my-account/") ||
    pathname.startsWith("/settings/appearance") ||
    pathname.startsWith("/in/")

  return (
    <authShare.StepUpProvider>
      <authShare.AuthGuard>
        <ShellLayout pathname={pathname} navigate={navigate}>
          {isIam ? (
            <Suspense fallback={routeFallback}>
              <IamRoutes />
            </Suspense>
          ) : isPlatform ? (
            <Suspense fallback={routeFallback}>
              <PlatformRoutes />
            </Suspense>
          ) : isFinance ? (
            <Suspense fallback={routeFallback}>
              <FinanceRoutes />
            </Suspense>
          ) : isCustomerOperation ? (
            <CustomersPage pathname={pathname} />
          ) : isWorkbench ? (
            <WorkbenchPage pathname={pathname} />
          ) : isWorkflowAdmin ? (
            <WorkflowAdminPage pathname={pathname} />
          ) : isAccount ? (
            <Suspense fallback={routeFallback}>
              <AccountRoutes />
            </Suspense>
          ) : (
            <Dashboard />
          )}
        </ShellLayout>
      </authShare.AuthGuard>
    </authShare.StepUpProvider>
  )
}

function Dashboard() {
  const { branding } = useSystemBranding()
  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">Shell</p>
      <h1 className="text-3xl font-semibold text-balance">
        {branding.appName} workspace
      </h1>
      <p className="text-muted-foreground text-pretty">
        Auth, layout, i18n, theme, and notifications now live in the shell.
        Domain pages load as runtime micro frontends.
      </p>
    </section>
  )
}
