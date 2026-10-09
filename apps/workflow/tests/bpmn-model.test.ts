import { describe, expect, test } from "bun:test"
import { analyzeBpmnFile, findBpmnElement, normalizeBpmnRef } from "../src/features/workflow/components/bpmn-model"

describe("BPMN model helpers", () => {
  test("normalizes references and reports missing Zeebe task definitions", () => {
    const elements = [
      { id: "Process_1", type: "bpmn:Process", businessObject: { $type: "bpmn:Process", id: "Process_1", name: "Loan process", isExecutable: true } },
      { id: "Task_1", type: "bpmn:ServiceTask", businessObject: { $type: "bpmn:ServiceTask", id: "Task_1" } },
      { id: "Flow_1", type: "bpmn:SequenceFlow" },
    ]

    expect(normalizeBpmnRef("  Loan Process ")).toBe("loan-process")
    expect(findBpmnElement(elements, " process_1 ")?.id).toBe("Process_1")
    expect(analyzeBpmnFile(elements)).toMatchObject({
      processId: "Process_1",
      processName: "Loan process",
      executable: true,
      tasks: 1,
      jobs: 0,
      flows: 1,
      missingJobTypes: ["Task_1"],
    })
  })
})
