import { afterAll, expect, test } from "bun:test"

// The adapter only needs an event target with window's name; restore the
// global afterwards so other suites keep their window-less environment.
const hadWindow = "window" in globalThis
const fakeWindow = new EventTarget() as EventTarget & { __ardaErrorAskAiEnabled?: boolean }
Object.assign(globalThis, { window: fakeWindow })
afterAll(() => {
  if (!hadWindow) delete (globalThis as { window?: unknown }).window
})

const { bridgeLegacyErrorAskAi } = await import("../../apps/shell/src/legacy-error-ask-ai")

// What a remote built before the notifications channel does (old @workspace/ui).
const legacyRemoteAsks = (prompt: string) =>
  fakeWindow.dispatchEvent(new CustomEvent("arda:error:ask-ai", { detail: { prompt } }))

test("a legacy remote sees the assistant and reaches the shell handler until cleanup", () => {
  const asked: string[] = []
  let capabilityEvents = 0
  fakeWindow.addEventListener("arda:error:ask-ai-capability", () => capabilityEvents++)

  const cleanup = bridgeLegacyErrorAskAi((prompt) => asked.push(prompt))
  expect(fakeWindow.__ardaErrorAskAiEnabled).toBe(true)
  expect(capabilityEvents).toBe(1)
  legacyRemoteAsks("why did this fail?")
  expect(asked).toEqual(["why did this fail?"])

  cleanup()
  expect(fakeWindow.__ardaErrorAskAiEnabled).toBe(false)
  expect(capabilityEvents).toBe(2)
  legacyRemoteAsks("ignored")
  expect(asked).toEqual(["why did this fail?"])
})
