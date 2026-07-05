import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const backup = join(
  import.meta.dir,
  "../apps/hrm/src/features/hrm/pages.backup.tsx"
)
const lines = readFileSync(backup, "utf8").split("\n")

const head = `import type { ChangeEvent, ReactNode } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useFieldArray } from "react-hook-form"
import { getMediaContentUrl } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
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
import { Checkbox } from "@workspace/ui/components/checkbox"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { PageTitle as CollapsingPageTitle } from "@workspace/ui/components/page-title"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import { Edit2, Plus, Send, Trash2, Upload } from "lucide-react"
import type { EmployeeRegistration, OrgUnit, Position } from "../api"
import { fieldClass, type RegistrationValues } from "./schemas"
import { useWatch } from "react-hook-form"

`

let body = lines.slice(716, 1182).join("\n") + "\n" + lines.slice(1221, 1332).join("\n")
body = body.replace(/^function /gm, "export function ")

writeFileSync(join(import.meta.dir, "../apps/hrm/src/features/hrm/shared/ui.tsx"), head + body)
console.log("ui.tsx written")
