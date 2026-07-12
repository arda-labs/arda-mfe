import { lazy, Suspense } from "react"
import { useLocation } from "react-router-dom"

const CustomersPage = lazy(() =>
  import("@/features/customers/page").then((m) => ({ default: m.CustomersPage }))
)

export default function RemoteRoutes() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <CustomersPage pathname={pathname} />
      </Suspense>
    </div>
  )
}
