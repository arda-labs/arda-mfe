export type ToolKind = "read" | "confirm"
export type RiskLevel = "low" | "medium" | "high"
export type ToolSource = "internal" | "mcp"

export interface CatalogTool {
  methodName: string
  sdkPath: string
  domain: string
  service?: string
  signature: string
  jsdoc: string
  keywords?: string[]
  kind: ToolKind
  requiredPermissions: string[]
  risk: RiskLevel
  timeoutMs: number
  /** Derived state: contractEnabled AND (overrideEnabled ?? true) — ADR-003. */
  enabled: boolean
  /** Contract-level default from generated.go; a hard floor for overrides. */
  contractEnabled: boolean
  /** Runtime override; null when the tool follows the contract default. */
  overrideEnabled: boolean | null
  /** Tool origin. "internal" today; "mcp" when the MCP adapter lands. */
  source: ToolSource
  /** Audit fields of the latest runtime override (set/clear). */
  updatedBy?: string
  updatedAt?: string
}
