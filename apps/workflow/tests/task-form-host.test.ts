import { describe, expect, test } from "bun:test"
import { registryFromModule, resolveTaskForm } from "@workspace/workflow-task"
import { taskFormRemoteFor } from "../src/features/workbench/utils/task-form-routing"

describe("taskFormRemoteFor", () => {
  test("maps the pilot case type to its owner remote", () => {
    expect(taskFormRemoteFor("DPM_ADDITIONAL_V1")).toBe("deposit")
  })

  test("maps the deposit rollout case types to the same owner", () => {
    expect(taskFormRemoteFor("DPM_SETTLE_V2")).toBe("deposit")
    expect(taskFormRemoteFor("DPM_PAY_INTEREST_V1")).toBe("deposit")
    expect(taskFormRemoteFor("DPM_CAPITALIZE_V1")).toBe("deposit")
    expect(taskFormRemoteFor("DPM_PRODUCT_REGISTER_V1")).toBe("deposit")
    expect(taskFormRemoteFor("DPM_PRODUCT_EDIT_V1")).toBe("deposit")
    expect(taskFormRemoteFor("DPM_RATE_REGISTER_V1")).toBe("deposit")
    expect(taskFormRemoteFor("DPM_RATE_EDIT_V1")).toBe("deposit")
    expect(taskFormRemoteFor("DPM_BATCH_INTEREST_V1")).toBe("deposit")
  })

  test("case types without a registered form keep the transition path", () => {
    expect(taskFormRemoteFor("FIN_SINGLE_ENTRY_V2")).toBeUndefined()
    expect(taskFormRemoteFor("CUSTOMER_REGISTRATION")).toBeUndefined()
    expect(taskFormRemoteFor("IBM_PLACE_V1")).toBeUndefined()
    expect(taskFormRemoteFor(undefined)).toBeUndefined()
  })
})

describe("resolveTaskForm", () => {
  const form = () => null
  const registry = { "dpm_additional_v1.checker_review": form }

  test("resolves the server-provided formKey", () => {
    expect(
      resolveTaskForm(registry, "dpm_additional_v1.checker_review")
    ).toBe(form)
  })

  test("never falls back to another key", () => {
    expect(resolveTaskForm(registry, "dpm_additional_v1.maker_input")).toBe(
      undefined
    )
    expect(resolveTaskForm(registry, "")).toBeUndefined()
    expect(resolveTaskForm(registry, undefined)).toBeUndefined()
    expect(resolveTaskForm(undefined, "dpm_additional_v1.checker_review")).toBe(
      undefined
    )
    expect(registryFromModule(undefined)).toEqual({})
  })
})
