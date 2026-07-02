import { useEffect, useRef, useState } from "react"
import { LocateFixed, Redo2, Save, Undo2, ZoomIn, ZoomOut } from "lucide-react"
import BpmnViewer from "bpmn-js/lib/NavigatedViewer"
import BpmnModeler from "bpmn-js/lib/Modeler"
import "bpmn-js/dist/assets/bpmn-js.css"
import "bpmn-js/dist/assets/diagram-js.css"
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import type { WorkflowCase, WorkflowProcessDefinition } from "../api"
import { useUpdateProcessDefinition } from "../queries"

type BpmnCanvas = {
  zoom: (value?: string | number) => number
  viewbox: {
    (): BpmnViewbox
    (value: Pick<BpmnViewbox, "x" | "y" | "width" | "height">): BpmnViewbox
  }
  addMarker: (elementId: string, marker: string) => void
}

type BpmnViewbox = {
  x: number
  y: number
  width: number
  height: number
  inner?: {
    x: number
    y: number
    width: number
    height: number
  }
}

type BpmnElement = {
  id: string
  type: string
  businessObject?: {
    id?: string
    name?: string
    $type?: string
    $attrs?: Record<string, unknown>
    conditionExpression?: { body?: string }
    documentation?: { text?: string }[]
    isExecutable?: boolean
    incoming?: { id: string }[]
    outgoing?: { id: string }[]
  }
}

type BpmnSelection = {
  get: () => BpmnElement[]
  select: (element: BpmnElement) => void
}

type BpmnElementRegistry = {
  getAll: () => BpmnElement[]
  get: (id: string) => BpmnElement | undefined
}

type BpmnModeling = {
  updateProperties: (element: BpmnElement, properties: Record<string, unknown>) => void
}

type BpmnModdle = {
  create: (type: string, properties: Record<string, unknown>) => unknown
}

type BpmnCommandStack = {
  canUndo: () => boolean
  canRedo: () => boolean
  undo: () => void
  redo: () => void
}

type BpmnSaveCapable = BpmnViewer & {
  saveXML: (options?: { format?: boolean }) => Promise<{ xml?: string }>
  saveSVG: () => Promise<{ svg: string }>
}

export function BpmnViewerPanel({
  title,
  xml,
  highlightId,
  loading,
  side,
  className,
  canvasClassName,
}: {
  title: string
  xml: string
  highlightId?: string
  loading?: boolean
  side?: React.ReactNode
  className?: string
  canvasClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!containerRef.current || !xml) return
    let disposed = false
    let frame = 0
    const container = containerRef.current
    container.replaceChildren()
    const viewer = new BpmnViewer({ container })
    setError("")

    frame = window.requestAnimationFrame(() => {
      viewer
      .importXML(xml)
      .then(() => {
        if (disposed) return
        const canvas = viewer.get("canvas") as BpmnCanvas
        fitCanvasViewport(canvas)
        if (highlightId) {
          try {
            canvas.addMarker(highlightId, "highlight-current")
          } catch {
            setError(`Không tìm thấy BPMN element "${highlightId}" để highlight.`)
          }
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Không đọc được BPMN XML."
        setError(message)
      })
    })

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      try {
        viewer.destroy()
      } catch {
        container.replaceChildren()
      }
    }
  }, [xml, highlightId])

  if (loading) return <LoadingBlock />
  if (!xml) return <EmptyState text="Chọn hoặc import một định nghĩa BPMN để xem sơ đồ." />

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          {highlightId ? (
            <p className="font-mono text-xs text-muted-foreground">current: {highlightId}</p>
          ) : null}
        </div>
      </div>
      <div className={cn("grid min-h-[34rem]", side && "xl:grid-cols-[minmax(0,1fr)_22rem]")}>
        <div className={cn("relative min-h-[34rem]", canvasClassName)}>
          <div ref={containerRef} className="h-full min-h-[34rem] w-full bg-background" />
          {error ? (
            <div className="absolute bottom-3 left-3 right-3 rounded-md border bg-background/95 p-3 text-sm text-amber-700 shadow-sm">
              {error}
            </div>
          ) : null}
        </div>
        {side ? <div className="border-t p-3 xl:border-l xl:border-t-0">{side}</div> : null}
      </div>
      <style>{`
        .highlight-current:not(.djs-connection) .djs-visual > :nth-child(1) {
          stroke: var(--primary) !important;
          stroke-width: 4px !important;
        }
        .highlight-current.djs-connection .djs-visual > path {
          stroke: var(--primary) !important;
          stroke-width: 4px !important;
        }
      `}</style>
    </div>
  )
}

export function BpmnDefinitionViewerDialog({
  item,
  cases,
  xml,
  loading,
  open,
  onOpenChange,
}: {
  item: WorkflowProcessDefinition
  cases: WorkflowCase[]
  xml: string
  loading?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col bg-background p-0 text-foreground">
        <DialogHeader className="border-b bg-background px-5 py-3 text-foreground">
          <DialogTitle className="flex min-w-0 items-center gap-3 text-base text-foreground">
            <span className="truncate">{item.name}</span>
            <span className="truncate font-mono text-xs font-normal text-foreground/70">
              {item.bpmnProcessId} · v{item.version} · {item.resourceName}
            </span>
          </DialogTitle>
        </DialogHeader>
        <BpmnModelerWorkspace item={item} cases={cases} xml={xml} loading={loading} />
      </DialogContent>
    </Dialog>
  )
}

function BpmnModelerWorkspace({
  item,
  cases,
  xml,
  loading,
}: {
  item: WorkflowProcessDefinition
  cases: WorkflowCase[]
  xml: string
  loading?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const modelerRef = useRef<BpmnSaveCapable | null>(null)
  const [selectedElement, setSelectedElement] = useState<BpmnElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState("")
  const [elementCount, setElementCount] = useState(0)
  const [modelElements, setModelElements] = useState<BpmnElement[]>([])
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [dockHeight, setDockHeight] = useState(200)
  const [saving, setSaving] = useState(false)
  const updateMutation = useUpdateProcessDefinition()

  useEffect(() => {
    if (!containerRef.current || !xml) return
    let disposed = false
    let frame = 0
    const container = containerRef.current
    container.replaceChildren()
    setError("")
    setSelectedElement(null)
    setModelElements([])

    const modeler = new BpmnModeler({
      container,
      keyboard: { bindTo: document },
    }) as BpmnSaveCapable
    modelerRef.current = modeler

    const syncSelection = () => {
      const selection = modeler.get("selection") as BpmnSelection
      const element = selection.get()[0] ?? null
      setSelectedElement(element)
    }
    const syncZoom = () => {
      const canvas = modeler.get("canvas") as BpmnCanvas
      setZoom(Number(canvas.zoom().toFixed(2)))
    }

    modeler.on("selection.changed", syncSelection)
    modeler.on("commandStack.changed", () => {
      syncSelection()
      syncZoom()
    })

    frame = window.requestAnimationFrame(() => {
      modeler
        .importXML(xml)
        .then(() => {
          if (disposed) return
          const canvas = modeler.get("canvas") as BpmnCanvas
          const registry = modeler.get("elementRegistry") as BpmnElementRegistry
          const elements = registry.getAll().filter((element) => !element.type.includes("Label"))
          fitCanvasViewport(canvas)
          syncZoom()
          setModelElements(elements)
          setElementCount(elements.length)
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "Không đọc được BPMN XML."
          setError(message)
        })
    })

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      modelerRef.current = null
      try {
        modeler.destroy()
      } catch {
        container.replaceChildren()
      }
    }
  }, [xml])

  function canvasAction(action: (canvas: BpmnCanvas) => void) {
    const modeler = modelerRef.current
    if (!modeler) return
    const canvas = modeler.get("canvas") as BpmnCanvas
    action(canvas)
    setZoom(Number(canvas.zoom().toFixed(2)))
  }

  function selectElementByRef(ref?: string) {
    const modeler = modelerRef.current
    if (!modeler || !ref) return
    const registry = modeler.get("elementRegistry") as BpmnElementRegistry
    const selection = modeler.get("selection") as BpmnSelection
    const element = findBpmnElement(registry.getAll(), ref)
    if (!element) {
      setError(`Không tìm thấy BPMN element "${ref}" trên sơ đồ.`)
      return
    }
    selection.select(registry.get(element.id) ?? element)
    const canvas = modeler.get("canvas") as BpmnCanvas
    fitCanvasViewport(canvas)
    setSelectedElement(element)
    setError("")
  }

  function updateSelectedProperties(properties: Record<string, unknown>) {
    const modeler = modelerRef.current
    if (!modeler || !selectedElement) return
    const modeling = modeler.get("modeling") as BpmnModeling
    modeling.updateProperties(selectedElement, properties)
    setSelectedElement({
      ...selectedElement,
      businessObject: {
        ...selectedElement.businessObject,
        ...properties,
      },
    })
  }

  function updateConditionExpression(value: string) {
    const modeler = modelerRef.current
    if (!modeler || !selectedElement) return
    const moddle = modeler.get("moddle") as BpmnModdle
    updateSelectedProperties({
      conditionExpression: value
        ? moddle.create("bpmn:FormalExpression", { body: value })
        : undefined,
    })
  }

  function updateDocumentation(value: string) {
    const modeler = modelerRef.current
    if (!modeler || !selectedElement) return
    const moddle = modeler.get("moddle") as BpmnModdle
    updateSelectedProperties({
      documentation: value
        ? [moddle.create("bpmn:Documentation", { text: value })]
        : [],
    })
  }

  function updateExtensionAttr(key: string, value: string) {
    if (!selectedElement) return
    const attrs = { ...(selectedElement.businessObject?.$attrs ?? {}) }
    if (value.trim()) {
      attrs[key] = value
    } else {
      delete attrs[key]
    }
    updateSelectedProperties({ $attrs: attrs })
  }

  async function saveXml() {
    const modeler = modelerRef.current
    if (!modeler) return
    setSaving(true)
    try {
      const result = await modeler.saveXML({ format: true })
      const nextXml = result.xml ?? ""
      const file = new File([nextXml], item.resourceName || `${item.bpmnProcessId}.bpmn`, {
        type: "application/xml",
      })
      await updateMutation.mutateAsync({
        id: item.id,
        payload: {
          name: item.name,
          status: item.status,
          file,
        },
      })
    } finally {
      setSaving(false)
    }
  }

  async function exportXml() {
    const modeler = modelerRef.current
    if (!modeler) return
    const result = await modeler.saveXML({ format: true })
    downloadText(result.xml ?? "", item.resourceName || `${item.bpmnProcessId}.bpmn`, "application/xml")
  }

  async function exportSvg() {
    const modeler = modelerRef.current
    if (!modeler) return
    const result = await modeler.saveSVG()
    downloadText(result.svg, `${item.bpmnProcessId}.svg`, "image/svg+xml")
  }

  function undo() {
    const commandStack = modelerRef.current?.get("commandStack") as BpmnCommandStack | undefined
    if (commandStack?.canUndo()) commandStack.undo()
  }

  function redo() {
    const commandStack = modelerRef.current?.get("commandStack") as BpmnCommandStack | undefined
    if (commandStack?.canRedo()) commandStack.redo()
  }

  function startSidebarResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const originalBodyCursor = document.body.style.cursor
    const originalRootCursor = document.documentElement.style.cursor
    const originalUserSelect = document.body.style.userSelect
    document.body.style.cursor = "col-resize"
    document.documentElement.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const onMove = (moveEvent: PointerEvent) => {
      setSidebarWidth(clampNumber(startWidth + moveEvent.clientX - startX, 240, 560))
    }
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", cleanup)
      window.removeEventListener("pointercancel", cleanup)
      window.removeEventListener("blur", cleanup)
      document.body.style.cursor = originalBodyCursor
      document.documentElement.style.cursor = originalRootCursor
      document.body.style.userSelect = originalUserSelect
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", cleanup)
    window.addEventListener("pointercancel", cleanup)
    window.addEventListener("blur", cleanup)
  }

  function startDockResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = dockHeight
    let frame = 0
    const originalBodyCursor = document.body.style.cursor
    const originalRootCursor = document.documentElement.style.cursor
    const originalUserSelect = document.body.style.userSelect
    document.body.style.cursor = "row-resize"
    document.documentElement.style.cursor = "row-resize"
    document.body.style.userSelect = "none"

    const onMove = (moveEvent: PointerEvent) => {
      const nextHeight = clampNumber(startHeight + startY - moveEvent.clientY, 144, 680)
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => setDockHeight(nextHeight))
    }
    const cleanup = () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", cleanup)
      window.removeEventListener("pointercancel", cleanup)
      window.removeEventListener("blur", cleanup)
      document.body.style.cursor = originalBodyCursor
      document.documentElement.style.cursor = originalRootCursor
      document.body.style.userSelect = originalUserSelect
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", cleanup)
    window.addEventListener("pointercancel", cleanup)
    window.addEventListener("blur", cleanup)
  }

  if (loading) return <div className="p-4"><LoadingBlock /></div>
  if (!xml) return <div className="p-4"><EmptyState text="Chưa có XML để mở modeler." /></div>

  return (
    <div
      className="grid min-h-0 flex-1 bg-background text-foreground"
      style={{ gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr)` }}
    >
      <div className="relative min-h-0">
        <BpmnInspector
          item={item}
          selectedElement={selectedElement}
          elementCount={elementCount}
          onUpdateProperties={updateSelectedProperties}
          onUpdateCondition={updateConditionExpression}
          onUpdateDocumentation={updateDocumentation}
          onUpdateExtensionAttr={updateExtensionAttr}
        />
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-primary/30"
          onPointerDown={startSidebarResize}
        />
      </div>
      <div className="relative flex min-w-0 flex-col bg-background text-foreground">
        <div className="absolute right-3 top-3 z-10 flex flex-col items-center gap-1 rounded-md border bg-background/95 p-1 text-foreground shadow-sm">
          <Button type="button" size="icon" variant="ghost" title="Zoom in" aria-label="Zoom in" onClick={() => canvasAction((canvas) => canvas.zoom(zoom + 0.1))}>
            <ZoomIn className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" title="Zoom out" aria-label="Zoom out" onClick={() => canvasAction((canvas) => canvas.zoom(Math.max(0.2, zoom - 0.1)))}>
            <ZoomOut className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" title="Fit viewport" aria-label="Fit viewport" onClick={() => canvasAction(fitCanvasViewport)}>
            <LocateFixed className="size-4" />
          </Button>
          <span className="w-12 text-center font-mono text-[11px] text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <div className="h-px w-6 bg-border" />
          <Button type="button" size="icon" variant="ghost" title="Undo" aria-label="Undo" onClick={undo}>
            <Undo2 className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" title="Redo" aria-label="Redo" onClick={redo}>
            <Redo2 className="size-4" />
          </Button>
          <div className="h-px w-6 bg-border" />
          <Button type="button" size="icon" variant="ghost" title="Export XML" aria-label="Export XML" onClick={exportXml}>
            <span className="text-[10px] font-semibold">XML</span>
          </Button>
          <Button type="button" size="icon" variant="ghost" title="Export SVG" aria-label="Export SVG" onClick={exportSvg}>
            <span className="text-[10px] font-semibold">SVG</span>
          </Button>
          <Button type="button" size="icon" title="Lưu BPMN" aria-label="Lưu BPMN" onClick={saveXml} disabled={saving || updateMutation.isPending}>
            <Save className="size-4" />
          </Button>
        </div>
        <div className="relative min-h-0 flex-1">
          <div ref={containerRef} className="arda-bpmn-canvas h-full min-h-0 w-full cursor-default bg-background" />
          {error ? (
            <div className="absolute bottom-3 left-3 right-3 rounded-md border bg-background/95 p-3 text-sm text-amber-700 shadow-sm">
              {error}
            </div>
          ) : null}
        </div>
        <BpmnOperationsDock
          height={dockHeight}
          cases={cases}
          elements={modelElements}
          onResizeStart={startDockResize}
          onSelectElement={selectElementByRef}
        />
        <style>{`
          .arda-bpmn-canvas,
          .arda-bpmn-canvas .djs-container,
          .arda-bpmn-canvas .djs-container svg {
            cursor: default;
          }
        `}</style>
      </div>
    </div>
  )
}

function BpmnInspector({
  item,
  selectedElement,
  elementCount,
  onUpdateProperties,
  onUpdateCondition,
  onUpdateDocumentation,
  onUpdateExtensionAttr,
}: {
  item: WorkflowProcessDefinition
  selectedElement: BpmnElement | null
  elementCount: number
  onUpdateProperties: (properties: Record<string, unknown>) => void
  onUpdateCondition: (value: string) => void
  onUpdateDocumentation: (value: string) => void
  onUpdateExtensionAttr: (key: string, value: string) => void
}) {
  const businessObject = selectedElement?.businessObject
  const docs = businessObject?.documentation?.map((item) => item.text ?? "").join("\n") ?? ""
  const attrs = businessObject?.$attrs ?? {}
  const isProcess = businessObject?.$type === "bpmn:Process"
  const isSequenceFlow = businessObject?.$type === "bpmn:SequenceFlow"
  const isTask = selectedElement ? bpmnJobTypes.has(selectedElement.type) : false

  return (
    <aside className="h-full min-h-0 overflow-y-auto border-r bg-background p-3 pr-4 text-foreground">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-foreground/70">Quy trình</p>
          <h3 className="text-sm font-semibold text-foreground">{item.processCode}</h3>
          <p className="break-all font-mono text-xs text-foreground/70">{item.bpmnProcessId}</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-sm">
          <Field label="Version" value={`v${item.version}`} />
          <Field label="Status" value={item.status} />
          <Field label="Elements" value={String(elementCount)} />
          <Field label="Deploy key" value={String(item.deploymentKey ?? "-")} />
        </div>
        <div className="rounded-md border bg-card p-2.5 text-card-foreground">
          <h4 className="mb-2 text-sm font-semibold text-card-foreground">Properties</h4>
          {selectedElement ? (
            <Accordion
              type="multiple"
              defaultValue={["general"]}
            >
              <AccordionItem value="general">
                <AccordionTrigger className="py-2 text-sm">General</AccordionTrigger>
                <AccordionContent className="space-y-2.5 pb-3">
                <TextInput
                  label="Element id"
                  value={businessObject?.id ?? selectedElement.id}
                  onChange={(id) => onUpdateProperties({ id })}
                />
                <TextInput
                  label="Tên hiển thị"
                  value={businessObject?.name ?? ""}
                  onChange={(name) => onUpdateProperties({ name })}
                />
                <TextareaInput
                  label="Documentation"
                  value={docs}
                  onChange={onUpdateDocumentation}
                />
                <Field label="Loại" value={businessObject?.$type ?? selectedElement.type} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="execution">
                <AccordionTrigger className="py-2 text-sm">Execution</AccordionTrigger>
                <AccordionContent className="space-y-2.5 pb-3">
                {isProcess ? (
                  <SelectInput
                    label="Executable"
                    value={String(Boolean(businessObject?.isExecutable))}
                    options={[
                      { value: "true", label: "true" },
                      { value: "false", label: "false" },
                    ]}
                    onChange={(value) => onUpdateProperties({ isExecutable: value === "true" })}
                  />
                ) : null}
                {isTask ? (
                  <>
                    <TextInput
                      label="Job type"
                      value={String(attrs["zeebe:taskDefinition:type"] ?? attrs["taskType"] ?? "")}
                      onChange={(value) => onUpdateExtensionAttr("zeebe:taskDefinition:type", value)}
                    />
                    <TextInput
                      label="Retries"
                      value={String(attrs["zeebe:taskDefinition:retries"] ?? "")}
                      onChange={(value) => onUpdateExtensionAttr("zeebe:taskDefinition:retries", value)}
                    />
                    <TextInput
                      label="Form key"
                      value={String(attrs["formKey"] ?? attrs["zeebe:formDefinition:formKey"] ?? "")}
                      onChange={(value) => onUpdateExtensionAttr("formKey", value)}
                    />
                  </>
                ) : (
                  <EmptyState text="Chọn task để cấu hình job/form." />
                )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="routing">
                <AccordionTrigger className="py-2 text-sm">Routing</AccordionTrigger>
                <AccordionContent className="space-y-2.5 pb-3">
                {isSequenceFlow ? (
                  <TextareaInput
                    label="Condition expression"
                    value={businessObject?.conditionExpression?.body ?? ""}
                    onChange={onUpdateCondition}
                  />
                ) : (
                  <EmptyState text="Chọn sequence flow để cấu hình điều kiện rẽ nhánh." />
                )}
                <Field
                  label="Incoming"
                  value={businessObject?.incoming?.map((flow) => flow.id).join(", ") || "-"}
                />
                <Field
                  label="Outgoing"
                  value={businessObject?.outgoing?.map((flow) => flow.id).join(", ") || "-"}
                />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="extensions">
                <AccordionTrigger className="py-2 text-sm">Extensions</AccordionTrigger>
                <AccordionContent className="space-y-2.5 pb-3">
                <ExtensionAttrInput
                  label="Assignee"
                  attrKey="assignee"
                  attrs={attrs}
                  onChange={onUpdateExtensionAttr}
                />
                <ExtensionAttrInput
                  label="Candidate groups"
                  attrKey="candidateGroups"
                  attrs={attrs}
                  onChange={onUpdateExtensionAttr}
                />
                <ExtensionAttrInput
                  label="Priority"
                  attrKey="priority"
                  attrs={attrs}
                  onChange={onUpdateExtensionAttr}
                />
                <ExtensionAttrInput
                  label="Custom metadata"
                  attrKey="arda:metadata"
                  attrs={attrs}
                  onChange={onUpdateExtensionAttr}
                />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            <p className="text-sm text-foreground/70">
              Chọn một task/event/gateway trên canvas để xem và sửa thông tin.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}

function BpmnOperationsDock({
  height,
  cases,
  elements,
  onResizeStart,
  onSelectElement,
}: {
  height: number
  cases: WorkflowCase[]
  elements: BpmnElement[]
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void
  onSelectElement: (ref?: string) => void
}) {
  const [activeTab, setActiveTab] = useState("instances")
  const incidents = cases.filter((item) => ["FAILED", "SUSPENDED", "INCIDENT"].includes(item.status))
  const calledInstances = elements.filter((element) => element.type === "bpmn:CallActivity")
  const jobDefinitions = elements.filter((element) => bpmnJobTypes.has(element.type))

  return (
    <div
      className="relative shrink-0 border-t bg-background text-foreground"
      style={{ height }}
    >
      <div
        className="group absolute -top-2 left-0 right-0 z-10 flex h-4 cursor-row-resize items-center justify-center bg-transparent"
        onPointerDown={onResizeStart}
      >
        <span className="h-1 w-16 rounded-full bg-border transition-colors group-hover:bg-primary/60" />
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <TabsList className="h-10">
            <TabsTrigger value="instances">Process instances</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="called">Called instances</TabsTrigger>
            <TabsTrigger value="jobs">Job definitions</TabsTrigger>
          </TabsList>
          <span className="text-xs text-foreground/70">
            {cases.length} instance · {incidents.length} incident · {jobDefinitions.length} job
          </span>
        </div>
        <TabsContent value="instances" className="m-0 overflow-auto" style={{ height: height - 56 }}>
          <OperationsCasesTable
            emptyText="Chưa có process instance cho định nghĩa này."
            items={cases}
            onSelectElement={onSelectElement}
          />
        </TabsContent>
        <TabsContent value="incidents" className="m-0 overflow-auto" style={{ height: height - 56 }}>
          <OperationsCasesTable
            emptyText="Chưa có incident."
            items={incidents}
            onSelectElement={onSelectElement}
          />
        </TabsContent>
        <TabsContent value="called" className="m-0 overflow-auto" style={{ height: height - 56 }}>
          <OperationsElementsTable
            emptyText="Không có call activity trong BPMN này."
            items={calledInstances}
            onSelectElement={onSelectElement}
          />
        </TabsContent>
        <TabsContent value="jobs" className="m-0 overflow-auto" style={{ height: height - 56 }}>
          <OperationsElementsTable
            emptyText="Không có job/task definition trong BPMN này."
            items={jobDefinitions}
            onSelectElement={onSelectElement}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TextareaInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
    </label>
  )
}

function ExtensionAttrInput({
  label,
  attrKey,
  attrs,
  onChange,
}: {
  label: string
  attrKey: string
  attrs: Record<string, unknown>
  onChange: (key: string, value: string) => void
}) {
  return (
    <TextInput
      label={label}
      value={String(attrs[attrKey] ?? "")}
      onChange={(value) => onChange(attrKey, value)}
    />
  )
}

type SelectOption = {
  value: string
  label: string
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-foreground/80">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Chọn giá trị" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function OperationsCasesTable({
  items,
  emptyText,
  onSelectElement,
}: {
  items: WorkflowCase[]
  emptyText: string
  onSelectElement: (ref?: string) => void
}) {
  if (!items.length) return <div className="p-4 text-sm text-foreground/70">{emptyText}</div>

  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow>
          <TableHead>Instance</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Current step</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>SLA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer"
            onClick={() => onSelectElement(item.currentStep)}
          >
            <TableCell>
              <p className="font-mono text-xs text-foreground">{item.processInstanceKey ?? item.caseCode}</p>
              <p className="truncate text-xs text-foreground/70">{item.title}</p>
            </TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
            <TableCell className="font-mono text-xs">{item.currentStep || "-"}</TableCell>
            <TableCell>{item.assignedTo || item.candidateRole || "-"}</TableCell>
            <TableCell>{item.slaDueAt ? formatDateTime(item.slaDueAt) : "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function OperationsElementsTable({
  items,
  emptyText,
  onSelectElement,
}: {
  items: BpmnElement[]
  emptyText: string
  onSelectElement: (ref?: string) => void
}) {
  if (!items.length) return <div className="p-4 text-sm text-foreground/70">{emptyText}</div>

  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow>
          <TableHead>Element</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Incoming</TableHead>
          <TableHead>Outgoing</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} className="cursor-pointer" onClick={() => onSelectElement(item.id)}>
            <TableCell>
              <p className="font-medium">{item.businessObject?.name || item.id}</p>
              <p className="font-mono text-xs text-foreground/70">{item.id}</p>
            </TableCell>
            <TableCell className="font-mono text-xs">{item.businessObject?.$type ?? item.type}</TableCell>
            <TableCell className="font-mono text-xs">
              {item.businessObject?.incoming?.map((flow) => flow.id).join(", ") || "-"}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {item.businessObject?.outgoing?.map((flow) => flow.id).join(", ") || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}


function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border p-3 text-sm text-muted-foreground">{text}</div>
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground/70">{label}</p>
      <p className="break-words font-medium text-foreground">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "ACTIVE" || status === "COMPLETED" ? "secondary" : "outline"
  return <Badge variant={variant}>{status}</Badge>
}

function LoadingBlock() {
  return (
    <div className="flex min-h-32 items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

const bpmnJobTypes = new Set([
  "bpmn:BusinessRuleTask",
  "bpmn:ManualTask",
  "bpmn:ReceiveTask",
  "bpmn:ScriptTask",
  "bpmn:SendTask",
  "bpmn:ServiceTask",
  "bpmn:Task",
  "bpmn:UserTask",
])

function findBpmnElement(elements: BpmnElement[], ref: string) {
  const target = normalizeBpmnRef(ref)
  return elements.find((element) => {
    const id = normalizeBpmnRef(element.id)
    const boID = normalizeBpmnRef(element.businessObject?.id ?? "")
    const name = normalizeBpmnRef(element.businessObject?.name ?? "")
    return id === target || boID === target || name === target
  })
}

function normalizeBpmnRef(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-")
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function fitCanvasViewport(canvas: BpmnCanvas) {
  canvas.zoom("fit-viewport")
  const viewbox = canvas.viewbox()
  const inner = viewbox.inner
  if (!inner) return
  canvas.viewbox({
    x: inner.x + inner.width / 2 - viewbox.width / 2,
    y: inner.y + inner.height / 2 - viewbox.height / 2,
    width: viewbox.width,
    height: viewbox.height,
  })
}
