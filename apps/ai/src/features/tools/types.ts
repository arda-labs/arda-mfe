export type ToolKind = "read" | "confirm"
export type RiskLevel = "low" | "medium" | "high"

export interface CatalogTool {
  methodName: string
  sdkPath: string
  domain: string
  signature: string
  jsdoc: string
  keywords?: string[]
  kind: ToolKind
  requiredPermissions: string[]
  risk: RiskLevel
  timeoutMs: number
}

export type MCPProtocol = "sse" | "stdio" | "http"
export type MCPStatus = "connected" | "disconnected" | "error"

export interface MCPServer {
  id: string
  name: string
  endpoint: string
  protocol: MCPProtocol
  status: MCPStatus
  toolsCount: number
  description: string
}
