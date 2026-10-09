import { describe, expect, test } from "bun:test"
import { mdmListDefinition, MDM_DEFAULT_PAGE_SIZE } from "../src/features/mdm/list-query"

describe("MDM catalog list", () => {
  test("maps code search and active state to the server list contract", () => {
    expect(MDM_DEFAULT_PAGE_SIZE).toBe(10)
    expect(mdmListDefinition.queryKey).toEqual(["mdm", "catalog", "list"])
    expect(mdmListDefinition.queryConfig.sortableColumns).toEqual(["code", "name", "created_at"])
    expect(mdmListDefinition.queryConfig.filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ urlKey: "code", apiKey: "q", mode: "text" }),
      expect.objectContaining({ urlKey: "is_active", allowedValues: ["true", "false"] }),
    ]))
  })

})
