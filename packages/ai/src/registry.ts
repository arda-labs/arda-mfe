import type { ComponentType } from "react"
import type { ToolResultPayload } from "./messages"

export type ToolResultViewProps = {
  result: ToolResultPayload
  messageId: string
}

export type ToolRendererEntry = {
  id: string
  match: (result: ToolResultPayload) => boolean
  component: ComponentType<ToolResultViewProps>
}

const toolRenderers = new Map<string, ToolRendererEntry>()
const contextContributors = new Map<string, () => Record<string, unknown>>()

let defaultRenderersRegistered = false

export function registerToolRenderer(entry: ToolRendererEntry): () => void {
  toolRenderers.set(entry.id, entry)
  return () => {
    toolRenderers.delete(entry.id)
  }
}

export function resolveToolRenderer(
  result: ToolResultPayload
): ToolRendererEntry | undefined {
  for (const entry of toolRenderers.values()) {
    if (entry.match(result)) return entry
  }
  return undefined
}

export function markDefaultRenderersRegistered() {
  defaultRenderersRegistered = true
}

export function areDefaultRenderersRegistered() {
  return defaultRenderersRegistered
}

export function registerOlorinContext(
  id: string,
  contributor: () => Record<string, unknown>
): () => void {
  contextContributors.set(id, contributor)
  return () => {
    contextContributors.delete(id)
  }
}

export function collectOlorinContext(): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  for (const contributor of contextContributors.values()) {
    try {
      Object.assign(merged, contributor())
    } catch {
      continue
    }
  }
  return merged
}
