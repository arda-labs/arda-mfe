import { afterEach, describe, expect, test } from "bun:test"
import { getErrorAskAiHandler, setErrorAskAiHandler } from "../src/error-ask-ai"

const cleanups: Array<() => void> = []
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.()
})

describe("error ask-AI channel", () => {
  test("no handler is registered by default", () => {
    expect(getErrorAskAiHandler()).toBeUndefined()
  })

  test("the registered handler receives the prompt until it is cleaned up", () => {
    const asked: string[] = []
    const cleanup = setErrorAskAiHandler((prompt) => asked.push(prompt))
    getErrorAskAiHandler()?.("why did this fail?")
    expect(asked).toEqual(["why did this fail?"])
    cleanup()
    expect(getErrorAskAiHandler()).toBeUndefined()
  })

  test("a stale cleanup does not clear a newer handler", () => {
    const first = () => {}
    const second = () => {}
    const clearFirst = setErrorAskAiHandler(first)
    cleanups.push(setErrorAskAiHandler(second))
    clearFirst()
    expect(getErrorAskAiHandler()).toBe(second)
  })
})
