import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dir, "../apps/hrm/src/features/hrm")
const srcPath = join(dir, "pages.tsx")
copyFileSync(srcPath, join(dir, "pages.backup.tsx"))

const lines = readFileSync(srcPath, "utf8").split("\n")
const imports = lines.slice(0, 69).join("\n")

mkdirSync(join(dir, "shared"), { recursive: true })

const schemas = lines.slice(69, 212).join("\n")
writeFileSync(
  join(dir, "shared/schemas.ts"),
  `${imports}\n\n${schemas}\n\nexport type PositionValues = z.infer<typeof positionSchema>
export type JobTitleValues = z.infer<typeof jobTitleSchema>
export type OrgUnitValues = z.infer<typeof orgUnitSchema>
export type RegistrationValues = z.infer<typeof registrationSchema>
export {
  fieldClass,
  positionSchema,
  jobTitleSchema,
  orgUnitSchema,
  registrationSchema,
  positionDefaults,
  jobTitleDefaults,
  orgUnitDefaults,
  registrationDefaults,
}
`
)

const sharedUi = lines.slice(1221).join("\n")
const registrationHelpers = lines.slice(716, 1182).join("\n")

writeFileSync(
  join(dir, "shared/ui.tsx"),
  `import type { ReactNode } from "react"
import type { UseFormReturn } from "react-hook-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { CollapsingPageTitle as PageTitle } from "@workspace/ui/components/page-title"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Edit2, Plus, Trash2 } from "lucide-react"
import type { RegistrationValues } from "./schemas"

${registrationHelpers.replace(/^function /gm, "export function ")}

${sharedUi.replace(/^function PageTitle/, "export function PageTitle").replace(/^function DataTable/, "export function DataTable").replace(/^function RowActions/, "export function RowActions").replace(/^function StatusBadge/, "export function StatusBadge").replace(/^function DialogActions/, "export function DialogActions").replace(/^function DeleteDialog/, "export function DeleteDialog")}
`
)

const pages = [
  ["positions", "PositionsPage", 214, 331],
  ["job-titles", "JobTitlesPage", 332, 419],
  ["org-units", "OrgUnitsPage", 420, 567],
  ["registrations", "RegistrationsPage", 568, 715],
  ["employees", "EmployeesPage", 1184, 1220],
]

for (const [folder, fn, start, end] of pages) {
  const pageDir = join(dir, folder)
  mkdirSync(pageDir, { recursive: true })
  const body = lines
    .slice(start - 1, end)
    .join("\n")
    .replace(`export function ${fn}`, `export function ${fn}`)
  writeFileSync(join(pageDir, "page.tsx"), body)
}

writeFileSync(
  join(dir, "pages.tsx"),
  `export { PositionsPage } from "./positions/page"
export { JobTitlesPage } from "./job-titles/page"
export { OrgUnitsPage } from "./org-units/page"
export { RegistrationsPage } from "./registrations/page"
export { EmployeesPage } from "./employees/page"
`
)

console.log("hrm split done — add imports to entity pages")
