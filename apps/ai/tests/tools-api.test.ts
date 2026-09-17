import { describe, expect, test } from "bun:test"
import { normalizeCatalogTool } from "../src/features/tools/api"
import type { CatalogTool } from "../src/features/tools/types"

/**
 * Regression: ai-service marshals a Go nil []string as JSON null, so catalog
 * entries without a permission requirement (e.g. docs.problemLookup) arrive
 * with `requiredPermissions: null`. The tools UI reads `.length` off the
 * field, so the adapter must restore the contract (always an array). The cast
 * on purpose reproduces that wire shape, which the declared type does not
 * model.
 */
const wireTool = {
  methodName: "docs.problemLookup",
  sdkPath: "arda.docs.problemLookup",
  domain: "docs",
  signature: "arda.docs.problemLookup(args: { code: string }): Promise<unknown>;",
  jsdoc: "/** Look up an Arda problem code. */",
  kind: "read",
  requiredPermissions: null,
  risk: "low",
  timeoutMs: 2000,
  enabled: true,
  contractEnabled: true,
  overrideEnabled: null,
  source: "internal",
} as unknown as CatalogTool

describe("normalizeCatalogTool", () => {
  test("null requiredPermissions becomes an empty array", () => {
    const tool = normalizeCatalogTool(wireTool)
    expect(tool.requiredPermissions).toEqual([])
    expect(tool.requiredPermissions.length).toBe(0)
  })

  test("declared permissions pass through untouched", () => {
    const tool = normalizeCatalogTool({
      ...wireTool,
      requiredPermissions: ["ai.knowledge.read"],
    })
    expect(tool.requiredPermissions).toEqual(["ai.knowledge.read"])
  })
})
