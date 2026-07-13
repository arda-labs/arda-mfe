import { lazy, Suspense, type ComponentType } from "react"
import { Spinner } from "@workspace/ui/components/spinner"

function lazyBpmn<T extends ComponentType<any>>(
  loader: () => Promise<{ [key: string]: T }>,
  exportName: string
) {
  const Lazy = lazy(async () => {
    const mod = await loader()
    const component = mod[exportName]
    if (!component) throw new Error(`Missing export ${exportName}`)
    return { default: component }
  })

  return function BpmnLazy(props: React.ComponentProps<T>) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-48 items-center justify-center">
            <Spinner />
          </div>
        }
      >
        <Lazy {...props} />
      </Suspense>
    )
  }
}

export const BpmnViewerPanel = lazyBpmn(
  () => import("./bpmn-monitor"),
  "BpmnViewerPanel"
)

export const BpmnDefinitionViewerDialog = lazyBpmn(
  () => import("./bpmn-monitor"),
  "BpmnDefinitionViewerDialog"
)

export const OperateBpmnViewer = lazyBpmn(
  () => import("./bpmn-monitor"),
  "OperateBpmnViewer"
)
