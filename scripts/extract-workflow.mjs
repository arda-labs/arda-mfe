import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dir, "../apps/workflow/src/features/workflow")
const srcPath = join(dir, "page.tsx")
const backupPath = join(dir, "page.backup.tsx")

copyFileSync(srcPath, backupPath)

const lines = readFileSync(srcPath, "utf8").split("\n")
const imports = lines
  .slice(0, 111)
  .join("\n")
  .replace(
    "from \"./components/bpmn-monitor\"",
    "from \"./components/bpmn-monitor-lazy\""
  )
const shared = lines.slice(570, 2650).join("\n")

mkdirSync(join(dir, "shared"), { recursive: true })
mkdirSync(join(dir, "pages"), { recursive: true })

writeFileSync(join(dir, "shared/admin-ui.tsx"), `${imports}\n\n${shared}\n`)

const routes = `export type WorkflowRoute =
  | "case-types"
  | "process-configs"
  | "sla-policies"
  | "description-templates"
  | "roles"
  | "monitoring"

${lines
  .slice(2651)
  .join("\n")
  .replace("function routeFromPath", "export function routeFromPath")}`

writeFileSync(join(dir, "routes.ts"), routes)

const pages = [
  ["case-types-page", "CaseTypesPage", 132, 181],
  ["process-configs-page", "ProcessConfigsPage", 183, 227],
  ["sla-policies-page", "SlaPoliciesPage", 229, 265],
  ["description-templates-page", "DescriptionTemplatesPage", 267, 306],
  ["process-roles-page", "ProcessRolesPage", 308, 426],
  ["process-monitoring-page", "ProcessMonitoringPage", 428, 569],
] 

for (const [file, fn, start, end] of pages) {
  const body = lines
    .slice(start - 1, end)
    .join("\n")
    .replace(`function ${fn}`, `export function ${fn}`)
  writeFileSync(join(dir, `pages/${file}.tsx`), body)
}

console.log("done")
