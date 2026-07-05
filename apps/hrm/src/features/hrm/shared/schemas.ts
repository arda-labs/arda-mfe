import { z } from "zod"

export const fieldClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"

export const positionSchema = z.object({
  code: z.string().trim().min(1, "Ma chuc vu la bat buoc"),
  name: z.string().trim().min(1, "Ten chuc vu la bat buoc"),
  status: z.enum(["active", "inactive"]),
  is_manager: z.boolean(),
  description: z.string().trim().optional(),
})

export const jobTitleSchema = z.object({
  code: z.string().trim().min(1, "Ma chuc danh la bat buoc"),
  name: z.string().trim().min(1, "Ten chuc danh la bat buoc"),
  description: z.string().trim().optional(),
})

export const orgUnitSchema = z.object({
  code: z.string().trim().min(1, "Ma phong ban la bat buoc"),
  organization_id: z.string().trim().min(1, "Ma don vi la bat buoc"),
  name: z.string().trim().min(1, "Ten phong ban la bat buoc"),
  org_level: z.string().trim().min(1, "Cap to chuc la bat buoc"),
  parent_id: z.string().trim().optional(),
  department_type: z.string().trim().min(1, "Loai phong ban la bat buoc"),
  status: z.enum(["active", "inactive"]),
  description: z.string().trim().optional(),
})

export const registrationSchema = z.object({
  employee_code: z.string().trim().optional(),
  employee_type: z.string().trim().min(1, "Loại nhân viên là bắt buộc"),
  avatar_file_id: z.string().trim().optional(),
  org_unit_id: z.string().trim().min(1, "Mã đơn vị là bắt buộc"),
  full_name: z.string().trim().min(1, "Tên nhân viên là bắt buộc"),
  date_of_birth: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  email: z.string().trim().email("Email không hợp lệ").or(z.literal("")),
  marital_status: z.string().trim().optional(),
  address: z.string().trim().min(1, "Địa chỉ là bắt buộc"),
  permanent_address: z.string().trim().min(1, "Địa chỉ thường trú là bắt buộc"),
  identity_no: z.string().trim().min(1, "Số định danh là bắt buộc"),
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

export type PositionValues = z.infer<typeof positionSchema>
export type JobTitleValues = z.infer<typeof jobTitleSchema>
export type OrgUnitValues = z.infer<typeof orgUnitSchema>
export type RegistrationValues = z.infer<typeof registrationSchema>

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
  identity_issue_place: "Bộ Công an",
  start_date: "",
  official_date: "",
  assignments: [],
  educations: [],
  family_members: [],
  delegations: [],
  attachments: [],
}
