import { describe, expect, test } from "bun:test"
import {
  cancelProcessInstanceBody,
  setInstanceVariablesBody,
} from "../src/features/workflow/api/monitoring/instances"
import { operateActionErrorMessage } from "../src/features/workflow/components/operate-action-error"

/**
 * workflow-service (arda-be#78) requires `reason` on Operate variable edits
 * and instance cancel; lock the request bodies and the error mapping.
 */
describe("operate request bodies", () => {
  test("set variables sends a trimmed reason and the element scope", () => {
    expect(
      setInstanceVariablesBody(
        { amount: 1 },
        { reason: "  sửa sai dữ liệu  ", elementInstanceKey: "2251799813685251" }
      )
    ).toEqual({
      variables: { amount: 1 },
      elementInstanceKey: 2251799813685251,
      local: undefined,
      reason: "sửa sai dữ liệu",
    })
  })

  test("set variables omits the element scope at instance level", () => {
    expect(
      setInstanceVariablesBody({ a: "x" }, { reason: "r" }).elementInstanceKey
    ).toBeUndefined()
  })

  test("cancel sends a trimmed reason", () => {
    expect(cancelProcessInstanceBody(" khách hủy ")).toEqual({
      reason: "khách hủy",
    })
  })
})

describe("operateActionErrorMessage", () => {
  const t = (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key
  const apiError = (status: number, message: string) =>
    Object.assign(new Error(message), { status, code: "error" })

  test("lists protected variable names from a 400", () => {
    expect(
      operateActionErrorMessage(
        t,
        apiError(
          400,
          "protected process variables cannot be changed: amount, pgdLimit"
        )
      )
    ).toBe(
      'workflow.operate.error_protected_variables:{"names":"amount, pgdLimit"}'
    )
  })

  test("maps the missing reason 400", () => {
    expect(
      operateActionErrorMessage(
        t,
        apiError(400, "reason is required to cancel a process instance")
      )
    ).toBe("workflow.operate.reason_required")
  })

  test("maps 404, 409, 502 and 503", () => {
    expect(operateActionErrorMessage(t, apiError(404, "x"))).toBe(
      "workflow.operate.error_not_found"
    )
    expect(operateActionErrorMessage(t, apiError(409, "x"))).toBe(
      "workflow.operate.error_case_closed"
    )
    expect(operateActionErrorMessage(t, apiError(502, "x"))).toBe(
      "workflow.operate.error_engine"
    )
    expect(operateActionErrorMessage(t, apiError(503, "x"))).toBe(
      "workflow.operate.error_unavailable"
    )
  })

  test("falls back to the server message", () => {
    expect(operateActionErrorMessage(t, apiError(500, "boom"))).toBe("boom")
    expect(operateActionErrorMessage(t, "nope")).toBeUndefined()
  })
})
