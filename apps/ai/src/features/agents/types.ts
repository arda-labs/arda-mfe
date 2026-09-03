export type DepartmentType = "HR" | "Sales" | "Finance" | "Tech" | "General"

export interface AgentConfig {
  id: string
  tenantId?: string
  name: string
  department: DepartmentType
  description: string
  systemPrompt: string
  modelId: string
  temperature: number
  allowedTools: string[]
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}
