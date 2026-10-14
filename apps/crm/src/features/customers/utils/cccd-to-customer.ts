import type { CccdFieldName, CccdScanApply } from "@workspace/document-scan"
import {
  GENDER_BY_SEX,
  IDENTITY_TYPE_BY_CARD,
  defaultValues,
  type CustomerFormValues,
} from "../schemas"

const FORM_FIELD: Partial<Record<CccdFieldName, keyof CustomerFormValues>> = {
  id_number: "identityNo",
  full_name: "name",
  date_of_birth: "dateOfBirth",
  sex: "gender",
  residence: "permanentAddress",
  issue_date: "identityIssueDate",
  issue_place: "identityIssuePlace",
  expiry_date: "identityExpiryDate",
}

export function toVietnameseNameCase(s: string): string {
  return s
    .normalize("NFC")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLocaleLowerCase("vi")
      return lower.charAt(0).toLocaleUpperCase("vi") + lower.slice(1)
    })
    .join(" ")
}

function toForm(field: CccdFieldName, value: string): string {
  if (field === "full_name") return toVietnameseNameCase(value)
  if (field === "sex") return GENDER_BY_SEX[value as keyof typeof GENDER_BY_SEX] ?? ""
  return value.trim()
}

/** A value the user did not type: empty, or still the schema default. */
function isUntouched(key: keyof CustomerFormValues, current: unknown): boolean {
  const v = typeof current === "string" ? current.trim() : ""
  return v === "" || v === defaultValues[key]
}

export function cccdFormPatch(
  input: Pick<CccdScanApply, "values" | "overwrite" | "cardVersion">,
  current: CustomerFormValues
): Partial<CustomerFormValues> {
  const patch: Partial<Record<keyof CustomerFormValues, string>> = {}
  for (const [ocrField, formField] of Object.entries(FORM_FIELD) as [CccdFieldName, keyof CustomerFormValues][]) {
    const raw = input.values[ocrField]?.trim()
    if (!raw) continue
    const next = toForm(ocrField, raw)
    if (!next) continue
    const now = current[formField]
    if (!isUntouched(formField, now) && now !== next && !input.overwrite.has(ocrField)) continue
    patch[formField] = next
  }
  if (isUntouched("identityType", current.identityType)) {
    patch.identityType = IDENTITY_TYPE_BY_CARD[input.cardVersion]
  }
  return patch as Partial<CustomerFormValues>
}

/** Current form values in OCR space, so the dialog can show "will overwrite". */
export function existingFromForm(values: CustomerFormValues): Partial<Record<CccdFieldName, string>> {
  const out: Partial<Record<CccdFieldName, string>> = {}
  for (const [ocrField, formField] of Object.entries(FORM_FIELD) as [CccdFieldName, keyof CustomerFormValues][]) {
    const v = values[formField]
    if (typeof v !== "string" || isUntouched(formField, v)) continue
    if (ocrField === "full_name") out[ocrField] = v.normalize("NFC").toLocaleUpperCase("vi").trim()
    else if (ocrField === "sex") {
      const code = (Object.entries(GENDER_BY_SEX).find(([, label]) => label === v) ?? [])[0]
      if (code) out[ocrField] = code
    } else out[ocrField] = v.trim()
  }
  return out
}

/** Set the province from the card address only when the address itself was
 * applied (the user did not decline overwriting it) or no province is chosen
 * yet; otherwise GeoLocationFields would wipe the user's ward/area. */
export function shouldSetProvince(
  patch: Partial<CustomerFormValues>,
  currentProvinceCode: string
): boolean {
  return "permanentAddress" in patch || currentProvinceCode.trim() === ""
}
