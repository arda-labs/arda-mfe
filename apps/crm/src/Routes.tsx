import { lazy, Suspense } from "react"
import { usePathname } from "@workspace/core/routing"

const CustomersPage = lazy(() =>
  import("@/features/customers/page").then((m) => ({ default: m.CustomersPage }))
)

export default function Routes() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <CrmRoutes />
      </Suspense>
    </div>
  )
}

function CrmRoutes() {
  const pathname = usePathname("/customers/registrations")
  return <CustomersPage pathname={pathname} />
}
