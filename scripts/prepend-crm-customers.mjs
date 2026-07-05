import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dir, "../apps/crm/src/features/customers")

const uiHeader = `import type { ChangeEvent, ReactNode } from "react"
import { Controller, type UseFormReturn } from "react-hook-form"
import { getMediaContentUrl } from "@workspace/media"
import { useI18n } from "@workspace/i18n"
import { FileText } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import type { Customer } from "../api"
import { GeoLocationFields } from "../geo-location-fields"
import { OrgUnitField } from "../org-unit-field"
import {
  businessFields,
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
import { Search } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { navigateTo } from "@workspace/core/routing"
import { useCustomers } from "../queries"
import { customerTypeLabel } from "../shared/form-utils"
import { EmptyTable, Header, StatusBadge } from "../shared/ui"

`,
  "components/relationships-panel.tsx": `import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
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
import {
  useCreateCustomerRelationship,
  useCustomerRelationships,
  useCustomers,
} from "../queries"
import {
  relationshipSchema,
  selectOptions,
  type RelationshipFormValues,
} from "../shared/schemas"
import { relationLabel } from "../shared/form-utils"
import { EmptyTable, Panel } from "../shared/ui"

`,
  "components/task-panel.tsx": `import { Check, RotateCcw, Send, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { CustomerTaskContext } from "../shared/task-context"
import { ContextField, Panel } from "../shared/ui"

`,
  "components/registration-tabs-list.tsx": `import { cn } from "@workspace/ui/lib/utils"
import { TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

`,
  "pages/registration-page.tsx": `import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { navigateTo } from "@workspace/core/routing"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { Plus, RotateCcw, Save, Send, X } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tabs, TabsContent } from "@workspace/ui/components/tabs"
import type { Customer, CustomerType } from "../api"
import { CustomerRegistrationTabsList } from "../components/registration-tabs-list"
import { CurrentTaskPanel } from "../components/task-panel"
import { RelationshipsPanel } from "../components/relationships-panel"
import { GeoLocationFields } from "../geo-location-fields"
import { OrgUnitField } from "../org-unit-field"
import {
  useCancelCustomer,
  useCompleteWorkflowTask,
  useCustomer,
  useSaveCustomer,
  useSubmitCustomer,
  useUploadCustomerAvatar,
} from "../queries"
import {
  businessFields,
  customerSchema,
  defaultValues,
  extendedFields,
  generalFieldsPrimary,
  generalFieldsRest,
  personalFields,
  selectOptions,
  type CustomerFormValues,
} from "../shared/schemas"
import { toFormValues, toPayload } from "../shared/form-utils"
import {
  hasTaskContext,
  resolveWorkflowJobKey,
  taskContextFromSearch,
} from "../shared/task-context"
import {
  AvatarUploader,
  EmptyState,
  FieldGrid,
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
import { Plus, RotateCcw, Save, Send, X } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import type { Customer } from "../api"
import { CurrentTaskPanel } from "../components/task-panel"
import { GeoLocationFields } from "../geo-location-fields"
import { OrgUnitField } from "../org-unit-field"
import {
  useCancelAmendment,
  useCompleteWorkflowTask,
  useCurrentAmendment,
  useCustomer,
  useStartAdjustment,
  useSubmitAmendment,
  useUpdateAmendment,
} from "../queries"
import {
  businessFields,
  customerSchema,
  defaultValues,
  extendedFields,
  generalFieldsPrimary,
  generalFieldsRest,
  personalFields,
  type CustomerFormValues,
} from "../shared/schemas"
import {
  computeChangedFields,
  customerTypeLabel,
  toAmendmentSnapshot,
  toFormValues,
} from "../shared/form-utils"
import {
  hasTaskContext,
  resolveWorkflowJobKey,
  taskContextFromSearch,
} from "../shared/task-context"
import {
  EmptyState,
  FieldGrid,
  Panel,
  RegistrationMetaBar,
  StatusBadge,
} from "../shared/ui"

`,
}

for (const [file, header] of Object.entries(headers)) {
  const path = join(dir, file)
  writeFileSync(path, header + readFileSync(path, "utf8"))
}

// RelationSelect lives inside relationships-panel in backup but we extracted RelationSelect separately in ui - check
// relationships extract included RelationSelect at 1209-1234 - it's in relationships-panel file not ui
// Fix relationships header - import RelationSelect from same file (it's in the extracted body)

console.log("prepend done")
