import { z } from "zod"
import type { useI18n } from "@workspace/i18n"

export type TFunction = ReturnType<typeof useI18n>["t"]

/**
 * Schemas are built through a factory receiving `t` (see iam GroupFormDialog):
 * validation messages live under crm.customers.validation.* and are resolved
 * at build time inside the component, never as static literals.
 */
export const buildCustomerSchema = (t: TFunction) =>
  z.object({
    id: z.string().trim().optional(),
    customerCode: z.string().trim().optional(),
    customerType: z.enum(["PERSONAL", "BUSINESS"]),
    avatarFileId: z.string().trim(),
    orgUnit: z.string().trim(),
    name: z.string().trim().min(1, t("crm.customers.validation.name_required")),
    provinceCode: z.string().trim(),
    wardCode: z.string().trim(),
    areaCode: z.string().trim(),
    permanentAddress: z.string().trim(),
    currentAddress: z.string().trim(),
    mobile: z.string().trim(),
    fixedPhone: z.string().trim(),
    email: z
      .string()
      .trim()
      .email(t("crm.customers.validation.email_invalid"))
      .or(z.literal("")),
    taxCode: z.string().trim(),
    fax: z.string().trim(),
    economicType: z.string().trim(),
    economicSector: z.string().trim(),
    bankAccount: z.string().trim(),
    bankName: z.string().trim(),
    gender: z.string().trim(),
    dateOfBirth: z.string().trim(),
    ethnicity: z.string().trim(),
    maritalStatus: z.string().trim(),
    birthPlace: z.string().trim(),
    occupation: z.string().trim(),
    educationLevel: z.string().trim(),
    cultureLevel: z.string().trim(),
    identityType: z.string().trim(),
    identityNo: z.string().trim(),
    oldIdentityNo: z.string().trim(),
    identityIssueDate: z.string().trim(),
    identityExpiryDate: z.string().trim(),
    identityIssuePlace: z.string().trim(),
    segment: z.string().trim(),
    riskLevel: z.string().trim(),
    rank: z.string().trim(),
    memberCardNo: z.string().trim(),
    memberCardIssueDate: z.string().trim(),
    memberCardIssuePlace: z.string().trim(),
    extendedOccupation: z.string().trim(),
    jobTitle: z.string().trim(),
    workDuration: z.string().trim(),
    laborContractType: z.string().trim(),
    workplace: z.string().trim(),
    workplaceAddress: z.string().trim(),
    note: z.string().trim(),
    shortName: z.string().trim(),
    businessRegistrationNo: z.string().trim(),
    businessIssueDate: z.string().trim(),
    issuingAuthority: z.string().trim(),
    establishedDate: z.string().trim(),
    website: z.string().trim(),
    representative: z.string().trim(),
    representativeTitle: z.string().trim(),
    representativeIdentityNo: z.string().trim(),
    businessLine: z.string().trim(),
  })

export type CustomerFormValues = z.infer<
  ReturnType<typeof buildCustomerSchema>
>

export const buildRelationshipSchema = (t: TFunction) =>
  z.object({
    relatedCustomerId: z
      .string()
      .trim()
      .min(1, t("crm.customers.validation.related_customer_required")),
    relationType: z
      .string()
      .trim()
      .min(1, t("crm.customers.validation.relation_type_required")),
    relationCode: z
      .string()
      .trim()
      .min(1, t("crm.customers.validation.relation_code_required")),
    reciprocalRelationCode: z
      .string()
      .trim()
      .min(1, t("crm.customers.validation.reciprocal_code_required")),
    status: z
      .string()
      .trim()
      .min(1, t("crm.customers.validation.status_required")),
  })

export type RelationshipFormValues = z.infer<
  ReturnType<typeof buildRelationshipSchema>
>

export const defaultValues: CustomerFormValues = {
  id: "",
  customerCode: "",
  customerType: "PERSONAL",
  avatarFileId: "",
  orgUnit: "",
  name: "",
  provinceCode: "",
  wardCode: "",
  areaCode: "",
  permanentAddress: "",
  currentAddress: "",
  mobile: "",
  fixedPhone: "",
  email: "",
  taxCode: "",
  fax: "",
  economicType: "",
  economicSector: "",
  bankAccount: "",
  bankName: "",
  gender: "Nam",
  dateOfBirth: "",
  ethnicity: "Kinh",
  maritalStatus: "Đã lập gia đình",
  birthPlace: "",
  occupation: "",
  educationLevel: "",
  cultureLevel: "",
  identityType: "Căn cước công dân",
  identityNo: "",
  oldIdentityNo: "",
  identityIssueDate: "",
  identityExpiryDate: "",
  identityIssuePlace: "",
  segment: "",
  riskLevel: "",
  rank: "",
  memberCardNo: "",
  memberCardIssueDate: "",
  memberCardIssuePlace: "",
  extendedOccupation: "",
  jobTitle: "",
  workDuration: "",
  laborContractType: "",
  workplace: "",
  workplaceAddress: "",
  note: "",
  shortName: "",
  businessRegistrationNo: "",
  businessIssueDate: "",
  issuingAuthority: "",
  establishedDate: "",
  website: "",
  representative: "",
  representativeTitle: "",
  representativeIdentityNo: "",
  businessLine: "",
}

/**
 * Option labels are i18n keys under crm.customers.options.*; resolve them
 * with t(option.label) at render time (see FieldGrid / RelationSelect).
 */
export const selectOptions = {
  customerType: [
    { value: "PERSONAL", label: "crm.customers.options.customer_type_personal" },
    { value: "BUSINESS", label: "crm.customers.options.customer_type_business" },
  ],
  generic: [{ value: "none", label: "crm.customers.options.select_none" }],
  relation: [
    { value: "SPOUSE", label: "crm.customers.options.relation_spouse" },
    { value: "PARENT", label: "crm.customers.options.relation_parent" },
    { value: "CHILD", label: "crm.customers.options.relation_child" },
    { value: "GUARANTOR", label: "crm.customers.options.relation_guarantor" },
  ],
  status: [
    { value: "ACTIVE", label: "crm.customers.options.status_active" },
    { value: "INACTIVE", label: "crm.customers.options.status_inactive" },
  ],
  gender: [
    { value: "Nam", label: "crm.customers.options.gender_male" },
    { value: "Nữ", label: "crm.customers.options.gender_female" },
    { value: "Khác", label: "crm.customers.options.gender_other" },
  ],
  maritalStatus: [
    { value: "Độc thân", label: "crm.customers.options.marital_single" },
    {
      value: "Đã lập gia đình",
      label: "crm.customers.options.marital_married",
    },
    { value: "Ly hôn", label: "crm.customers.options.marital_divorced" },
    { value: "Góa", label: "crm.customers.options.marital_widowed" },
  ],
  occupation: [
    { value: "Kinh doanh", label: "crm.customers.options.occupation_business" },
    {
      value: "Công chức",
      label: "crm.customers.options.occupation_civil_servant",
    },
    {
      value: "Nhân viên văn phòng",
      label: "crm.customers.options.occupation_office_worker",
    },
    { value: "Công nhân", label: "crm.customers.options.occupation_worker" },
    { value: "Nông dân", label: "crm.customers.options.occupation_farmer" },
    { value: "Tự do", label: "crm.customers.options.occupation_freelance" },
    { value: "Khác", label: "crm.customers.options.occupation_other" },
  ],
  educationLevel: [
    { value: "THPT", label: "crm.customers.options.education_high_school" },
    { value: "Cao đẳng", label: "crm.customers.options.education_college" },
    { value: "Đại học", label: "crm.customers.options.education_university" },
    { value: "Thạc sĩ", label: "crm.customers.options.education_master" },
    { value: "Tiến sĩ", label: "crm.customers.options.education_doctorate" },
  ],
  cultureLevel: [
    { value: "THCS", label: "crm.customers.options.culture_lower_secondary" },
    { value: "THPT", label: "crm.customers.options.culture_high_school" },
    { value: "Cao đẳng", label: "crm.customers.options.culture_college" },
    { value: "Đại học", label: "crm.customers.options.culture_university" },
    {
      value: "Sau đại học",
      label: "crm.customers.options.culture_postgraduate",
    },
  ],
  economicType: [
    {
      value: "DNNN",
      label: "crm.customers.options.economic_type_state_owned",
    },
    { value: "TNHH", label: "crm.customers.options.economic_type_llc" },
    {
      value: "Cổ phần",
      label: "crm.customers.options.economic_type_joint_stock",
    },
    { value: "Tư nhân", label: "crm.customers.options.economic_type_private" },
    {
      value: "Liên doanh",
      label: "crm.customers.options.economic_type_joint_venture",
    },
  ],
  economicSector: [
    {
      value: "Nông nghiệp",
      label: "crm.customers.options.economic_sector_agriculture",
    },
    {
      value: "Công nghiệp",
      label: "crm.customers.options.economic_sector_industry",
    },
    { value: "Dịch vụ", label: "crm.customers.options.economic_sector_service" },
    {
      value: "Xây dựng",
      label: "crm.customers.options.economic_sector_construction",
    },
    { value: "CNTT", label: "crm.customers.options.economic_sector_it" },
  ],
  segment: [
    { value: "VIP", label: "VIP" },
    { value: "Thường", label: "crm.customers.options.segment_regular" },
    { value: "Tiềm năng", label: "crm.customers.options.segment_potential" },
  ],
  riskLevel: [
    { value: "Thấp", label: "crm.customers.options.risk_low" },
    { value: "Trung bình", label: "crm.customers.options.risk_medium" },
    { value: "Cao", label: "crm.customers.options.risk_high" },
  ],
  rank: [
    { value: "Hạng 1", label: "crm.customers.options.rank_1" },
    { value: "Hạng 2", label: "crm.customers.options.rank_2" },
    { value: "Hạng 3", label: "crm.customers.options.rank_3" },
  ],
  identityType: [
    { value: "Căn cước công dân", label: "crm.customers.options.identity_type_cccd" },
    { value: "Chứng minh nhân dân", label: "crm.customers.options.identity_type_cmnd" },
    { value: "Hộ chiếu", label: "crm.customers.options.identity_type_passport" },
  ],
  workDuration: [
    { value: "Dưới 1 năm", label: "crm.customers.options.work_duration_under_1y" },
    { value: "Từ 1-3 năm", label: "crm.customers.options.work_duration_1_3y" },
    { value: "Từ 3-5 năm", label: "crm.customers.options.work_duration_3_5y" },
    { value: "Trên 5 năm", label: "crm.customers.options.work_duration_over_5y" },
  ],
}

export const generalFieldsPrimary: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "textarea"]
> = [["name", "crm.customers.fields.name", "input"]]

export const generalFieldsRest: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "textarea"]
> = [
  ["permanentAddress", "crm.customers.fields.permanent_address", "textarea"],
  ["currentAddress", "crm.customers.fields.current_address", "textarea"],
  ["mobile", "crm.customers.fields.mobile", "input"],
  ["fixedPhone", "crm.customers.fields.fixed_phone", "input"],
  ["email", "crm.customers.fields.email", "input"],
  ["taxCode", "crm.customers.fields.tax_code", "input"],
  ["fax", "crm.customers.fields.fax", "input"],
  ["economicType", "crm.customers.fields.economic_type", "select"],
  ["economicSector", "crm.customers.fields.economic_sector", "select"],
  ["bankAccount", "crm.customers.fields.bank_account", "input"],
  ["bankName", "crm.customers.fields.bank_name", "input"],
]

export const personalFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "date"]
> = [
  ["gender", "crm.customers.fields.gender", "select"],
  ["dateOfBirth", "crm.customers.fields.date_of_birth", "date"],
  ["ethnicity", "crm.customers.fields.ethnicity", "input"],
  ["maritalStatus", "crm.customers.fields.marital_status", "input"],
  ["birthPlace", "crm.customers.fields.birth_place", "input"],
  ["occupation", "crm.customers.fields.occupation", "select"],
  ["educationLevel", "crm.customers.fields.education_level", "select"],
  ["cultureLevel", "crm.customers.fields.culture_level", "select"],
  ["identityType", "crm.customers.fields.identity_type", "input"],
  ["identityNo", "crm.customers.fields.identity_no", "input"],
  ["oldIdentityNo", "crm.customers.fields.old_identity_no", "input"],
  ["identityIssueDate", "crm.customers.fields.identity_issue_date", "date"],
  ["identityExpiryDate", "crm.customers.fields.identity_expiry_date", "date"],
  ["identityIssuePlace", "crm.customers.fields.identity_issue_place", "input"],
]

export const extendedFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "date" | "textarea"]
> = [
  ["segment", "crm.customers.fields.segment", "select"],
  ["riskLevel", "crm.customers.fields.risk_level", "select"],
  ["rank", "crm.customers.fields.rank", "select"],
  ["memberCardNo", "crm.customers.fields.member_card_no", "input"],
  ["memberCardIssueDate", "crm.customers.fields.member_card_issue_date", "date"],
  ["memberCardIssuePlace", "crm.customers.fields.member_card_issue_place", "input"],
  ["extendedOccupation", "crm.customers.fields.extended_occupation", "input"],
  ["jobTitle", "crm.customers.fields.job_title", "input"],
  ["workDuration", "crm.customers.fields.work_duration", "select"],
  ["laborContractType", "crm.customers.fields.labor_contract_type", "input"],
  ["workplace", "crm.customers.fields.workplace", "input"],
  ["workplaceAddress", "crm.customers.fields.workplace_address", "input"],
  ["note", "crm.customers.fields.note", "textarea"],
]

export const businessFields: Array<
  [keyof CustomerFormValues, string, "input" | "date"]
> = [
  ["shortName", "crm.customers.fields.short_name", "input"],
  [
    "businessRegistrationNo",
    "crm.customers.fields.business_registration_no",
    "input",
  ],
  ["businessIssueDate", "crm.customers.fields.business_issue_date", "date"],
  ["issuingAuthority", "crm.customers.fields.issuing_authority", "input"],
  ["establishedDate", "crm.customers.fields.established_date", "date"],
  ["website", "crm.customers.fields.website", "input"],
  ["representative", "crm.customers.fields.representative", "input"],
  ["representativeTitle", "crm.customers.fields.representative_title", "input"],
  [
    "representativeIdentityNo",
    "crm.customers.fields.representative_identity_no",
    "input",
  ],
  ["businessLine", "crm.customers.fields.business_line", "input"],
]
