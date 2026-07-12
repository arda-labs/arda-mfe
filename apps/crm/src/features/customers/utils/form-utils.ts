import { notify } from "@workspace/notifications/notify"
import type { Customer, CustomerPayload, CustomerType } from "../../api"
import {
  defaultValues,
  selectOptions,
  type CustomerFormValues,
} from "../schemas"

function mutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : undefined
}

export async function runMutation<T>(
  action: () => Promise<T>,
  messages: {
    success: string
    error: string
    description?: string | ((data: T) => string | undefined)
  }
) {
  try {
    const result = await action()
    const description =
      typeof messages.description === "function"
        ? messages.description(result)
        : messages.description
    notify.success(messages.success, description)
    return result
  } catch (error) {
    notify.error(messages.error, mutationErrorMessage(error))
    throw error
  }
}

export function optionsFor(name: keyof CustomerFormValues) {
  const map: Partial<Record<keyof CustomerFormValues, { value: string; label: string }[]>> = {
    gender: selectOptions.gender,
    maritalStatus: selectOptions.maritalStatus,
    occupation: selectOptions.occupation,
    educationLevel: selectOptions.educationLevel,
    cultureLevel: selectOptions.cultureLevel,
    economicType: selectOptions.economicType,
    economicSector: selectOptions.economicSector,
    segment: selectOptions.segment,
    riskLevel: selectOptions.riskLevel,
    rank: selectOptions.rank,
    identityType: selectOptions.identityType,
    workDuration: selectOptions.workDuration,
  }
  return map[name] ?? selectOptions.generic
}

export function toPayload(
  values: CustomerFormValues,
  existingId?: string,
  existingStatus?: Customer["status"]
) {
  const generalInfo = pick(values, [
    "orgUnit",
    "avatarFileId",
    "provinceCode",
    "wardCode",
    "areaCode",
    "permanentAddress",
    "currentAddress",
    "fixedPhone",
    "taxCode",
    "fax",
    "economicType",
    "economicSector",
    "bankAccount",
    "bankName",
  ])
  const personalInfo =
    values.customerType === "PERSONAL"
      ? pick(values, [
          "gender",
          "dateOfBirth",
          "ethnicity",
          "maritalStatus",
          "birthPlace",
          "occupation",
          "educationLevel",
          "cultureLevel",
          "identityType",
          "identityNo",
          "oldIdentityNo",
          "identityIssueDate",
          "identityExpiryDate",
          "identityIssuePlace",
        ])
      : {}
  const businessInfo =
    values.customerType === "BUSINESS"
      ? pick(values, [
          "shortName",
          "businessRegistrationNo",
          "businessIssueDate",
          "issuingAuthority",
          "establishedDate",
          "website",
          "representative",
          "representativeTitle",
          "representativeIdentityNo",
          "businessLine",
        ])
      : {}
  const extendedInfo =
    values.customerType === "PERSONAL"
      ? pick(values, [
          "memberCardNo",
          "memberCardIssueDate",
          "memberCardIssuePlace",
          "extendedOccupation",
          "jobTitle",
          "workDuration",
          "laborContractType",
          "workplace",
          "workplaceAddress",
          "note",
        ])
      : {}

  const payload: CustomerPayload = {
    customerType: values.customerType,
    name: values.name.trim(),
    email: values.email.trim(),
    status: existingStatus ?? "DRAFT",
    mobile: values.mobile.trim(),
    identityNo:
      values.customerType === "PERSONAL"
        ? values.identityNo.trim()
        : values.representativeIdentityNo.trim(),
    address: values.currentAddress.trim() || values.permanentAddress.trim(),
    segment: values.segment.trim(),
    rank: values.rank.trim(),
    riskLevel: values.riskLevel.trim(),
    generalInfo,
    personalInfo,
    businessInfo,
    extendedInfo,
  }
  const id = (existingId ?? values.id ?? "").trim()
  if (id) payload.id = id
  return payload
}

export function toFormValues(customer: Customer): CustomerFormValues {
  const general = customer.generalInfo
  const personal = customer.personalInfo
  const business = customer.businessInfo
  const extended = customer.extendedInfo
  return {
    ...defaultValues,
    id: customer.id,
    customerCode: customer.customerCode,
    customerType: customer.customerType,
    avatarFileId: stringValue(general.avatarFileId),
    orgUnit: stringValue(general.orgUnit),
    name: customer.name,
    provinceCode: stringValue(general.provinceCode),
    wardCode: stringValue(general.wardCode),
    areaCode: stringValue(general.areaCode),
    permanentAddress: stringValue(general.permanentAddress),
    currentAddress: stringValue(general.currentAddress),
    mobile: customer.mobile,
    fixedPhone: stringValue(general.fixedPhone),
    email: customer.email,
    taxCode: stringValue(general.taxCode),
    fax: stringValue(general.fax),
    economicType: stringValue(general.economicType),
    economicSector: stringValue(general.economicSector),
    bankAccount: stringValue(general.bankAccount),
    bankName: stringValue(general.bankName),
    gender: stringValue(personal.gender) || defaultValues.gender,
    dateOfBirth: stringValue(personal.dateOfBirth),
    ethnicity: stringValue(personal.ethnicity) || defaultValues.ethnicity,
    maritalStatus:
      stringValue(personal.maritalStatus) || defaultValues.maritalStatus,
    birthPlace: stringValue(personal.birthPlace),
    occupation: stringValue(personal.occupation),
    educationLevel: stringValue(personal.educationLevel),
    cultureLevel: stringValue(personal.cultureLevel),
    identityType:
      stringValue(personal.identityType) || defaultValues.identityType,
    identityNo: stringValue(personal.identityNo) || customer.identityNo,
    oldIdentityNo: stringValue(personal.oldIdentityNo),
    identityIssueDate: stringValue(personal.identityIssueDate),
    identityExpiryDate: stringValue(personal.identityExpiryDate),
    identityIssuePlace: stringValue(personal.identityIssuePlace),
    segment: customer.segment,
    riskLevel: customer.riskLevel,
    rank: customer.rank,
    memberCardNo: stringValue(extended.memberCardNo),
    memberCardIssueDate: stringValue(extended.memberCardIssueDate),
    memberCardIssuePlace: stringValue(extended.memberCardIssuePlace),
    extendedOccupation: stringValue(extended.extendedOccupation),
    jobTitle: stringValue(extended.jobTitle),
    workDuration: stringValue(extended.workDuration),
    laborContractType: stringValue(extended.laborContractType),
    workplace: stringValue(extended.workplace),
    workplaceAddress: stringValue(extended.workplaceAddress),
    note: stringValue(extended.note),
    shortName: stringValue(business.shortName),
    businessRegistrationNo: stringValue(business.businessRegistrationNo),
    businessIssueDate: stringValue(business.businessIssueDate),
    issuingAuthority: stringValue(business.issuingAuthority),
    establishedDate: stringValue(business.establishedDate),
    website: stringValue(business.website),
    representative: stringValue(business.representative),
    representativeTitle: stringValue(business.representativeTitle),
    representativeIdentityNo:
      stringValue(business.representativeIdentityNo) || customer.identityNo,
    businessLine: stringValue(business.businessLine),
  }
}

export function pick(
  values: CustomerFormValues,
  keys: Array<keyof CustomerFormValues>
) {
  return Object.fromEntries(keys.map((key) => [key, values[key]]))
}

export function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

export function customerTypeLabel(value: CustomerType) {
  return value === "BUSINESS" ? "Doanh nghiệp" : "Cá nhân"
}

export function relationLabel(value: string) {
  return (
    selectOptions.relation.find((item) => item.value === value)?.label ?? value
  )
}

export function toAmendmentSnapshot(values: CustomerFormValues): Record<string, unknown> {
  const payload = toPayload(values, values.id, "ACTIVE")
  return {
    name: payload.name,
    email: payload.email,
    mobile: payload.mobile,
    identityNo: payload.identityNo,
    address: payload.address,
    customerType: payload.customerType,
    personalInfo: payload.personalInfo,
    businessInfo: payload.businessInfo,
    extendedInfo: payload.extendedInfo,
    generalInfo: payload.generalInfo,
  }
}

export function computeChangedFields(
  customer: Customer | null,
  afterSnapshot: Record<string, unknown>
): string[] {
  if (!customer) return []
  const fields: string[] = []
  const compare = (key: string, before: string, after: unknown) => {
    if (String(after ?? "").trim() !== before.trim()) fields.push(key)
  }
  compare("name", customer.name, afterSnapshot.name)
  compare("email", customer.email, afterSnapshot.email)
  compare("mobile", customer.mobile, afterSnapshot.mobile)
  compare("identityNo", customer.identityNo, afterSnapshot.identityNo)
  compare("address", customer.address, afterSnapshot.address)
  return fields
}
