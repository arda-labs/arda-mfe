// Live run-status store shared between the SSE adapter (producer) and UI
// components (consumers). The adapter reports phase transitions as they
// arrive on the wire; the status bar renders them. One store for the whole
// app is fine: only one run streams at a time, and reports are thread-scoped
// so a stale thread switch never shows the wrong run.

export type OlorinRunPhase = "idle" | "thinking" | "tool" | "responding"

export type OlorinRunStatus = {
  threadId: string | null
  phase: OlorinRunPhase
  toolName: string | null
  startedAt: number | null
  /** Terminal error message of the last failed run for this thread, if any. */
  error: string | null
}

let snapshot: OlorinRunStatus = {
  threadId: null,
  phase: "idle",
  toolName: null,
  startedAt: null,
  error: null,
}

const listeners = new Set<() => void>()

function set(next: OlorinRunStatus): void {
  if (
    snapshot.threadId === next.threadId &&
    snapshot.phase === next.phase &&
    snapshot.toolName === next.toolName &&
    snapshot.startedAt === next.startedAt &&
    snapshot.error === next.error
  ) {
    return // no-op reports (e.g. every text delta) never re-render the UI
  }
  snapshot = next
  for (const listener of listeners) listener()
}

/** Called by the adapter when a run starts streaming. */
export function reportRunStart(threadId: string): void {
  set({ threadId, phase: "thinking", toolName: null, startedAt: Date.now(), error: null })
}

/** Called when the model starts streaming a tool call. */
export function reportToolStart(toolName: string): void {
  set({ ...snapshot, phase: "tool", toolName })
}

/** Called on the first text delta — the model is writing the answer. */
export function reportTextDelta(): void {
  if (snapshot.phase !== "responding") {
    set({ ...snapshot, phase: "responding", toolName: null })
  }
}

/** Called when a tool finished; the model now processes its result. */
export function reportToolDone(): void {
  if (snapshot.phase === "tool") {
    set({ ...snapshot, phase: "thinking", toolName: null })
  }
}

/** Called when the stream ends successfully or is aborted. */
export function reportRunEnd(): void {
  set({ threadId: null, phase: "idle", toolName: null, startedAt: null, error: null })
}

/** Called when the stream ends with an error; `error` is shown to the user. */
export function reportRunFailed(error: string): void {
  set({ threadId: snapshot.threadId, phase: "idle", toolName: null, startedAt: null, error })
}

/** Clears the terminal error bubble without starting a run. */
export function clearRunError(): void {
  if (snapshot.error !== null) {
    set({ ...snapshot, error: null })
  }
}

export function subscribeOlorinRunStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getOlorinRunStatus(): OlorinRunStatus {
  return snapshot
}
