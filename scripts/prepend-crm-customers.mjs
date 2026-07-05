import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dir, "../apps/crm/src/features/customers")

const uiHeader = `import type { ChangeEvent, ReactNode } from "react"
import { Controller, type UseFormReturn } from "react-hook-form"
import { getMediaContentUrl } from "@workspace/media"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { Check, FileText, Plus, RotateCcw, Save, Search, Send, Upload, X } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageTitle } from "@workspace/ui/components/page-title"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import type { Customer } from "../api"
import { GeoLocationFields } from "../geo-location-fields"
import { OrgUnitField } from "../org-unit-field"
import {
  businessFields,
  defaultValues,
  extendedFields,
  generalFieldsPrimary,
  generalFieldsRest,
  personalFields,
  selectOptions,
  type CustomerFormValues,
} from "./schemas"
import { optionsFor } from "./form-utils"

`

writeFileSync(
  join(dir, "shared/ui.tsx"),
  uiHeader + readFileSync(join(dir, "shared/ui.tsx"), "utf8")
)

const headers = {
  "components/customer-table.tsx": `import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { Search } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { PageTitle } from "@workspace/ui/components/page-title"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import type { Customer } from "../api"
import { useCustomers } from "../queries"
import { navigateTo } from "@workspace/core/routing"
import { customerTypeLabel } from "../shared/form-utils"
import { EmptyTable, StatusBadge } from "../shared/ui"

`,
  "components/relationships-panel.tsx": `import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { notify } from "@workspace/notifications/notify"
import { Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import type { Customer } from "../api"
import { useCreateCustomerRelationship, useCustomerRelationships } from "../queries"
import {
  relationshipSchema,
  selectOptions,
  type RelationshipFormValues,
} from "../shared/schemas"
import { relationLabel } from "../shared/form-utils"
import { EmptyTable, Panel, StatusBadge } from "../shared/ui"

`,
  "components/task-panel.tsx": `import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import type { Customer } from "../api"
import { useCompleteWorkflowTask } from "../queries"
import type { CustomerTaskContext } from "../shared/task-context"
import {
  ContextField,
  effectiveBpmnElementId,
  hasTaskContext,
  syncTaskContextSearch,
} from "../shared/task-context"
import { Panel } from "../shared/ui"

`,
  "components/registration-tabs-list.tsx": `import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import { TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

`,
  "pages/registration-page.tsx": `import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { FileText, Plus, RotateCcw, Save, Send } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageTitle } from "@workspace/ui/components/page-title"
import { Tabs, TabsContent } from "@workspace/ui/components/tabs"
import type { Customer } from "../api"
import { CustomerRegistrationTabsList } from "../components/registration-tabs-list"
import { CurrentTaskPanel } from "../components/task-panel"
import { RelationshipsPanel } from "../components/relationships-panel"
import {
  useCancelCustomer,
  useCustomer,
  useSaveCustomer,
  useSubmitCustomer,
  useUploadCustomerAvatar,
} from "../queries"
import {
  customerSchema,
  defaultValues,
  type CustomerFormValues,
} from "../shared/schemas"
import { toFormValues, toPayload } from "../shared/form-utils"
import {
  taskContextFromSearch,
} from "../shared/task-context"
import {
  AvatarUploader,
  FieldGrid,
  Header,
  Panel,
  RegistrationMetaBar,
  RegistrationSubmittedBanner,
} from "../shared/ui"

`,
  "pages/adjustment-page.tsx": `import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { RotateCcw, Save, Send } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageTitle } from "@workspace/ui/components/page-title"
import { Tabs, TabsContent } from "@workspace/ui/components/tabs"
import type { Customer } from "../api"
import { CustomerRegistrationTabsList } from "../components/registration-tabs-list"
import { CurrentTaskPanel } from "../components/task-panel"
import {
  useCancelAmendment,
  useCurrentAmendment,
  useCustomer,
  useStartAdjustment,
  useSubmitAmendment,
  useUpdateAmendment,
} from "../queries"
import {
  customerSchema,
  defaultValues,
  type CustomerFormValues,
} from "../shared/schemas"
import {
  computeChangedFields,
  toAmendmentSnapshot,
  toFormValues,
} from "../shared/form-utils"
import { taskContextFromSearch } from "../shared/task-context"
import {
  AvatarUploader,
  FieldGrid,
  Header,
  Panel,
  RegistrationMetaBar,
} from "../shared/ui"

`,
}

for (const [file, header] of Object.entries(headers)) {
  const path = join(dir, file)
  const body = readFileSync(path, "utf8")
  writeFileSync(path, header + body)
}

// Export relationshipSchema from schemas - add to schemas file
const schemas = readFileSync(join(dir, "shared/schemas.ts"), "utf8")
if (!schemas.includes("export const relationshipSchema")) {
  writeFileSync(
    join(dir, "shared/schemas.ts"),
    schemas.replace("const relationshipSchema", "export const relationshipSchema")
  )
}

console.log("crm prepend done")
