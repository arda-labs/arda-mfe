import { z } from "zod"

export const fieldClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"

export const buildPositionSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("hrm.positions.validation.code_required")),
    name: z
      .string()
      .trim()
      .min(1, t("hrm.positions.validation.name_required")),
    status: z.enum(["active", "inactive"]),
    is_manager: z.boolean(),
    description: z.string().trim().optional(),
  })

export const buildJobTitleSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("hrm.job_titles.validation.code_required")),
    name: z
      .string()
      .trim()
      .min(1, t("hrm.job_titles.validation.name_required")),
    description: z.string().trim().optional(),
  })

export const buildOrgUnitSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.code_required")),
    organization_id: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.organization_required")),
    name: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.name_required")),
    org_level: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.org_level_required")),
    parent_id: z.string().trim().optional(),
    department_type: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.department_type_required")),
    status: z.enum(["active", "inactive"]),
    description: z.string().trim().optional(),
  })

export const buildRegistrationSchema = (t: (key: string) => string) =>
  z.object({
    employee_code: z.string().trim().optional(),
    employee_type: z
      .string()
      .trim()
      .min(1, t("hrm.registrations.validation.employee_type_required")),
    avatar_file_id: z.string().trim().optional(),
    org_unit_id: z
      .string()
      .trim()
      .min(1, t("hrm.registrations.validation.org_unit_required")),
    full_name: z
      .string()
      .trim()
      .min(1, t("hrm.registrations.validation.full_name_required")),
    date_of_birth: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    mobile: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .email(t("hrm.registrations.validation.email_invalid"))
      .or(z.literal("")),
    marital_status: z.string().trim().optional(),
    address: z
      .string()
      .trim()
      .min(1, t("hrm.registrations.validation.address_required")),
    permanent_address: z
      .string()
      .trim()
      .min(1, t("hrm.registrations.validation.permanent_address_required")),
    identity_no: z
      .string()
      .trim()
      .min(1, t("hrm.registrations.validation.identity_no_required")),
    identity_issue_date: z.string().trim().optional(),
    identity_expiry_date: z.string().trim().optional(),
    identity_issue_place: z.string().trim().optional(),
    start_date: z.string().trim().optional(),
    official_date: z.string().trim().optional(),
    assignments: z.array(
      z.object({
        work_unit_id: z.string().trim().optional(),
        department_id: z.string().trim().optional(),
        position_id: z.string().trim().optional(),
        effective_date: z.string().trim().optional(),
        expiry_date: z.string().trim().optional(),
      })
    ),
    educations: z.array(
      z.object({
        education_level: z.string().trim().optional(),
        training_type: z.string().trim().optional(),
        school: z.string().trim().optional(),
        major: z.string().trim().optional(),
        from_year: z.string().trim().optional(),
        to_year: z.string().trim().optional(),
      })
    ),
    family_members: z.array(
      z.object({
        relationship: z.string().trim().optional(),
        full_name: z.string().trim().optional(),
        date_of_birth: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        address: z.string().trim().optional(),
        dependent: z.boolean(),
      })
    ),
    delegations: z.array(
      z.object({
        employee_code: z.string().trim().optional(),
        employee_name: z.string().trim().optional(),
        department: z.string().trim().optional(),
        position: z.string().trim().optional(),
        decision_no: z.string().trim().optional(),
        content: z.string().trim().optional(),
        effective_date: z.string().trim().optional(),
        expiry_date: z.string().trim().optional(),
      })
    ),
    attachments: z.array(
      z.object({
        document_type: z.string().trim().optional(),
        document_name: z.string().trim().optional(),
        file_name: z.string().trim().optional(),
        note: z.string().trim().optional(),
      })
    ),
  })

export type PositionValues = z.infer<ReturnType<typeof buildPositionSchema>>
export type JobTitleValues = z.infer<ReturnType<typeof buildJobTitleSchema>>
export type OrgUnitValues = z.infer<ReturnType<typeof buildOrgUnitSchema>>
export type RegistrationValues = z.infer<
  ReturnType<typeof buildRegistrationSchema>
>

export const positionDefaults: PositionValues = {
  code: "",
  name: "",
  status: "active",
  is_manager: false,
  description: "",
}

export const jobTitleDefaults: JobTitleValues = {
  code: "",
  name: "",
  description: "",
}

export const orgUnitDefaults: OrgUnitValues = {
  code: "",
  organization_id: "",
  name: "",
  org_level: "",
  parent_id: "",
  department_type: "",
  status: "active",
  description: "",
}

export const registrationDefaults: RegistrationValues = {
  employee_code: "",
  employee_type: "EMPLOYEE",
  avatar_file_id: "",
  org_unit_id: "",
  full_name: "",
  date_of_birth: "",
  gender: "",
  mobile: "",
  email: "",
  marital_status: "",
  address: "",
  permanent_address: "",
  identity_no: "",
  identity_issue_date: "",
  identity_expiry_date: "",
  identity_issue_place: "",
  start_date: "",
  official_date: "",
  assignments: [],
  educations: [],
  family_members: [],
  delegations: [],
  attachments: [],
}
