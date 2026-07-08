import { useEffect } from "react"
import {
  createTransactionWorkbench,
  TransactionSearchPage,
} from "./transaction-workbench"
import { DraftWorkbenchPage } from "./drafts-page"
import { navigateTo } from "./nav"

type WorkbenchRoute = "drafts" | "incoming" | "outgoing" | "search"

export function WorkbenchPage({ pathname }: { pathname: string }) {
  useEffect(() => {
    if (pathname.startsWith("/workbench/my-tasks")) {
      navigateTo("/workbench/incoming-transactions")
    }
  }, [pathname])

  const route = routeFromPath(pathname)
  if (pathname.startsWith("/workbench/my-tasks")) return null
  if (route === "incoming") return <TransactionWorkbench direction="incoming" />
  if (route === "outgoing")
    return <TransactionWorkbench direction="outgoing" />
  if (route === "search") return <TransactionSearchPage />
  return <DraftWorkbenchPage />
}

export function TransactionWorkbench({
  direction,
  title,
  description,
}: {
  direction: "incoming" | "outgoing"
  title?: string
  description?: string
}) {
  const meta = directionMeta[direction]
  const WorkbenchComponent = createTransactionWorkbench(
    direction,
    title ?? meta.title,
    description
  )
  return <WorkbenchComponent />
}

const directionMeta = {
  incoming: {
    title: "Giao dịch đến",
    description: "Các việc cần xử lý",
  },
  outgoing: {
    title: "Giao dịch đi",
    description: "Các việc đã gửi đi",
  },
}

function routeFromPath(pathname: string): WorkbenchRoute {
  if (pathname.startsWith("/workbench/incoming-transactions")) return "incoming"
  if (pathname.startsWith("/workbench/outgoing-transactions")) return "outgoing"
  if (pathname.startsWith("/workbench/transaction-search")) return "search"
  return "drafts"
}
