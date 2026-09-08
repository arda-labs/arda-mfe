import { useEffect } from "react"
import { useI18n } from "@workspace/i18n"
import {
  createTransactionWorkbench,
  TransactionSearchPage,
} from "./components/transaction-workbench"
import { DraftWorkbenchPage } from "./drafts-page"
import { navigateTo } from "./utils/nav"

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
  if (route === "outgoing") return <TransactionWorkbench direction="outgoing" />
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
  const { t } = useI18n()
  const meta = directionMeta[direction](t)
  const WorkbenchComponent = createTransactionWorkbench(
    direction,
    title ?? meta.title,
    description
  )
  return <WorkbenchComponent />
}

const directionMeta = {
  incoming: (t: TFn) => ({
    title: t("workflow.workbench.incoming_title"),
    description: t("workflow.workbench.incoming_description"),
  }),
  outgoing: (t: TFn) => ({
    title: t("workflow.workbench.outgoing_title"),
    description: t("workflow.workbench.outgoing_description"),
  }),
}

type TFn = ReturnType<typeof useI18n>["t"]

function routeFromPath(pathname: string): WorkbenchRoute {
  if (pathname.startsWith("/workbench/incoming-transactions")) return "incoming"
  if (pathname.startsWith("/workbench/outgoing-transactions")) return "outgoing"
  if (pathname.startsWith("/workbench/transaction-search")) return "search"
  return "drafts"
}
