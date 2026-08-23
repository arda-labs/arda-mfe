import "@workspace/i18n/apps/crm"
import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import {
  attachPreload,
  lazyWithPreload,
} from "@workspace/ui/lib/lazy"

const CustomersPage = lazyWithPreload(() =>
  import("@/features/customers/page").then((m) => ({
    default: m.CustomersPage,
  }))
)

async function preload() {
  await CustomersPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <CustomersPage pathname={pathname} />
      </Suspense>
    </div>
  )
}

const RemoteRoutesWithPreload = attachPreload(RemoteRoutes, preload)

export default RemoteRoutesWithPreload
