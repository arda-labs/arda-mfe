import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dir, "../apps/hrm/src/features/hrm")

const headers = {
  "positions/page.tsx": `import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { notify } from "@workspace/ui/feedback/notify"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import type { Position } from "../api"
import {
  useCreatePosition,
  useDeletePosition,
  usePositions,
  useUpdatePosition,
} from "../queries"
import {
  fieldClass,
  positionDefaults,
  positionSchema,
  type PositionValues,
} from "../shared/schemas"
import {
  DataTable,
  DeleteDialog,
  DialogActions,
  PageTitle,
  RowActions,
  StatusBadge,
} from "../shared/ui"

`,
  "job-titles/page.tsx": `import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { notify } from "@workspace/ui/feedback/notify"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import type { JobTitle } from "../api"
import {
  useCreateJobTitle,
  useDeleteJobTitle,
  useJobTitles,
  useUpdateJobTitle,
} from "../queries"
import {
  fieldClass,
  jobTitleDefaults,
  jobTitleSchema,
  type JobTitleValues,
} from "../shared/schemas"
import {
  DataTable,
  DeleteDialog,
  DialogActions,
  PageTitle,
  RowActions,
} from "../shared/ui"

`,
  "org-units/page.tsx": `import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { notify } from "@workspace/ui/feedback/notify"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import type { OrgUnit } from "../api"
import {
  useCreateOrgUnit,
  useDeleteOrgUnit,
  useOrganizations,
  useOrgUnits,
  useUpdateOrgUnit,
} from "../queries"
import {
  fieldClass,
  orgUnitDefaults,
  orgUnitSchema,
  type OrgUnitValues,
} from "../shared/schemas"
import {
  DataTable,
  DeleteDialog,
  DialogActions,
  PageTitle,
  RowActions,
  StatusBadge,
} from "../shared/ui"

`,
  "registrations/page.tsx": `import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageTitle as CollapsingPageTitle } from "@workspace/ui/components/page-title"
import { Tabs, TabsContent } from "@workspace/ui/components/tabs"
import { Plus, Send } from "lucide-react"
import type { EmployeeRegistration } from "../api"
import {
  useCreateEmployeeRegistration,
  useOrgUnits,
  usePositions,
  useSubmitEmployeeRegistration,
  useUpdateEmployeeRegistration,
  useUploadEmployeeAvatar,
} from "../queries"
import {
  registrationDefaults,
  registrationSchema,
  type RegistrationValues,
} from "../shared/schemas"
import {
  AssignmentsTable,
  AttachmentsTable,
  DelegationsTable,
  EducationsTable,
  FamilyTable,
  RegistrationGeneralPanel,
  RegistrationMetaBar,
  RegistrationTabsList,
  registrationStatusLabel,
  toRegistrationPayload,
} from "../shared/ui"

`,
  "employees/page.tsx": `import { useEmployees } from "../queries"
import { DataTable, PageTitle ( } from "../shared/ui"

`.replace("PageTitle (", "PageTitle"),
}

// fix employees header typo
headers["employees/page.tsx"] = `import { useMemo } from "react"
import { Badge } from "@workspace/ui/components/badge"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import {
  useEmployees,
  useJobTitles,
  useOrgUnits,
  usePositions,
} from "../queries"
import { DataTable, StatusBadge } from "../shared/ui"

`

for (const [file, header] of Object.entries(headers)) {
  const path = join(dir, file)
  const body = readFileSync(path, "utf8")
  writeFileSync(path, header + body)
}

console.log("hrm page headers added")
