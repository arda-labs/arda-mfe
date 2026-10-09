import BpmnViewer from 'bpmn-js/lib/NavigatedViewer'

export type BpmnOverlays = {
  add: (
    elementId: string,
    options: { position: Record<string, string | number>; html: HTMLElement }
  ) => void
  remove: (elementId: string) => void
  clear: () => void
}

export type BpmnCanvas = {
  zoom: (value?: string | number) => number
  viewbox: {
    (): BpmnViewbox
    (value: Pick<BpmnViewbox, "x" | "y" | "width" | "height">): BpmnViewbox
  }
  addMarker: (elementId: string, marker: string) => void
  removeMarker: (elementId: string, marker: string) => void
}

export type BpmnViewbox = {
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

export type BpmnElement = {
  id: string
  type: string
  businessObject?: {
    id?: string
    name?: string
    $type?: string
    $attrs?: Record<string, unknown>
    conditionExpression?: { body?: string }
    documentation?: { text?: string }[]
    extensionElements?: BpmnExtensionElements
    processRef?: {
      id?: string
      name?: string
      isExecutable?: boolean
    }
    isExecutable?: boolean
    incoming?: { id: string }[]
    outgoing?: { id: string }[]
  }
}

export type BpmnSelection = {
  get: () => BpmnElement[]
  select: (element: BpmnElement) => void
}

export type BpmnElementRegistry = {
  getAll: () => BpmnElement[]
  get: (id: string) => BpmnElement | undefined
}

export type BpmnModeling = {
  updateProperties: (
    element: BpmnElement,
    properties: Record<string, unknown>
  ) => void
}

export type BpmnModdle = {
  create: (
    type: string,
    properties: Record<string, unknown>
  ) => BpmnModdleElement
}

export type BpmnModdleElement = Record<string, unknown> & {
  $type?: string
  values?: BpmnModdleElement[]
}

export type BpmnExtensionElements = BpmnModdleElement & {
  values?: BpmnModdleElement[]
}

export type BpmnCommandStack = {
  canUndo: () => boolean
  canRedo: () => boolean
  undo: () => void
  redo: () => void
}

export type BpmnSaveCapable = BpmnViewer & {
  saveXML: (options?: { format?: boolean }) => Promise<{ xml?: string }>
  saveSVG: () => Promise<{ svg: string }>
}

export type BpmnFileInfo = {
  processId: string
  processName: string
  executable?: boolean
  tasks: number
  gateways: number
  events: number
  flows: number
  jobs: number
  callActivities: number
  missingJobTypes: string[]
  legacyConditions: string[]
}


export const bpmnJobTypes = new Set([
  "bpmn:BusinessRuleTask",
  "bpmn:ManualTask",
  "bpmn:ReceiveTask",
  "bpmn:ScriptTask",
  "bpmn:SendTask",
  "bpmn:ServiceTask",
  "bpmn:Task",
  "bpmn:UserTask",
])

export function findBpmnElement(elements: BpmnElement[], ref: string) {
  const target = normalizeBpmnRef(ref)
  return elements.find((element) => {
    const id = normalizeBpmnRef(element.id)
    const boID = normalizeBpmnRef(element.businessObject?.id ?? "")
    const name = normalizeBpmnRef(element.businessObject?.name ?? "")
    return id === target || boID === target || name === target
  })
}

export function analyzeBpmnFile(elements: BpmnElement[]): BpmnFileInfo {
  const process = elements.find(
    (element) => element.businessObject?.$type === "bpmn:Process"
  )?.businessObject
  const participant = elements.find(
    (element) => element.businessObject?.$type === "bpmn:Participant"
  )?.businessObject
  const processRef = process ?? participant?.processRef
  const taskElements = elements.filter((element) =>
    bpmnJobTypes.has(element.type)
  )
  const missingJobTypes = taskElements
    .filter((element) => !getTaskDefinitionType(element.businessObject))
    .map((element) => element.businessObject?.id ?? element.id)
  const legacyConditions = elements
    .filter((element) =>
      element.businessObject?.conditionExpression?.body?.trim().startsWith("${")
    )
    .map((element) => element.businessObject?.id ?? element.id)

  return {
    processId: processRef?.id ?? "",
    processName: processRef?.name ?? participant?.name ?? "",
    executable: processRef?.isExecutable,
    tasks: taskElements.length,
    gateways: elements.filter((element) => element.type.includes("Gateway"))
      .length,
    events: elements.filter((element) => element.type.includes("Event")).length,
    flows: elements.filter((element) => element.type === "bpmn:SequenceFlow")
      .length,
    jobs: taskElements.length - missingJobTypes.length,
    callActivities: elements.filter(
      (element) => element.type === "bpmn:CallActivity"
    ).length,
    missingJobTypes,
    legacyConditions,
  }
}

export function getTaskDefinitionType(businessObject: BpmnElement["businessObject"]) {
  const attrs = businessObject?.$attrs ?? {}
  return String(
    getZeebeElement(businessObject, "zeebe:TaskDefinition")?.type ??
      attrs["zeebe:taskDefinition:type"] ??
      attrs["taskType"] ??
      attrs["camunda:topic"] ??
      ""
  ).trim()
}

export function normalizeBpmnRef(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-")
}

export function normalizeModelBeforeSave(modeler: BpmnSaveCapable) {
  const registry = modeler.get("elementRegistry") as BpmnElementRegistry
  const modeling = modeler.get("modeling") as BpmnModeling
  const moddle = modeler.get("moddle") as BpmnModdle

  for (const element of registry.getAll()) {
    const businessObject = element.businessObject
    if (!businessObject) continue

    const condition = businessObject.conditionExpression
    if (condition?.body) {
      const nextBody = normalizeZeebeExpression(condition.body)
      if (nextBody !== condition.body) {
        modeling.updateProperties(element, {
          conditionExpression: moddle.create("bpmn:FormalExpression", {
            body: nextBody,
          }),
        })
      }
    }

    const attrs = businessObject.$attrs ?? {}
    const legacyType = String(
      attrs["zeebe:taskDefinition:type"] ??
        attrs["taskType"] ??
        attrs["camunda:topic"] ??
        ""
    )
    if (!bpmnJobTypes.has(element.type) || !legacyType.trim()) continue

    const extensionElements = buildZeebeExtensionElements({
      moddle,
      businessObject,
      elementType: "zeebe:TaskDefinition",
      properties: {
        type: legacyType,
        retries: String(attrs["zeebe:taskDefinition:retries"] ?? ""),
      },
      keep: true,
    })
    modeling.updateProperties(element, { extensionElements })
  }
}

export function normalizeZeebeExpression(value: string) {
  const expression = value.trim()
  if (!expression || expression.startsWith("=")) return expression
  const c7Expression = expression.match(/^\$\{(.+)\}$/)
  const body = c7Expression ? c7Expression[1].trim() : expression
  return `=${body
    .replace(/\s+==\s+/g, " = ")
    .replace(/\s+&&\s+/g, " and ")
    .replace(/\s+\|\|\s+/g, " or ")
    .replace(/'([^']*)'/g, '"$1"')}`
}

export function getZeebeElement(
  businessObject: BpmnElement["businessObject"],
  elementType: string
) {
  return businessObject?.extensionElements?.values?.find(
    (item) => item.$type === elementType
  )
}

export function buildZeebeExtensionElements({
  moddle,
  businessObject,
  elementType,
  properties,
  keep,
}: {
  moddle: BpmnModdle
  businessObject: BpmnElement["businessObject"]
  elementType: string
  properties: Record<string, string>
  keep: boolean
}) {
  const values = [...(businessObject?.extensionElements?.values ?? [])].filter(
    (item) => item.$type !== elementType
  )
  if (keep)
    values.push(moddle.create(elementType, compactStringProperties(properties)))
  if (!values.length) return undefined
  return moddle.create("bpmn:ExtensionElements", { values })
}

export function compactStringProperties(properties: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value.trim())
  )
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function fitCanvasViewport(canvas: BpmnCanvas) {
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
