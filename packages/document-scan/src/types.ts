// Wire contract of arda-be document-service (snake_case, see BE plan).

export type CccdFieldName =
  | "id_number"
  | "full_name"
  | "date_of_birth"
  | "sex"
  | "nationality"
  | "place_of_origin"
  | "residence"
  | "issue_date"
  | "issue_place"
  | "expiry_date"

export const CCCD_FIELDS: readonly CccdFieldName[] = [
  "id_number",
  "full_name",
  "date_of_birth",
  "sex",
  "nationality",
  "place_of_origin",
  "residence",
  "issue_date",
  "issue_place",
  "expiry_date",
]

export type FieldKind = "text" | "date" | "sex"

export const FIELD_KIND: Record<CccdFieldName, FieldKind> = {
  id_number: "text",
  full_name: "text",
  date_of_birth: "date",
  sex: "sex",
  nationality: "text",
  place_of_origin: "text",
  residence: "text",
  issue_date: "date",
  issue_place: "text",
  expiry_date: "date",
}

export type CardVersion = "cccd_chip_2021" | "can_cuoc_2024" | "cccd_barcode" | "unknown"
export type ModelLocation = "cloud" | "local"

export interface ExtractedField {
  /** Normalized: ISO date, "M"/"F", digits for id_number; null when unreadable. */
  value: string | null
  /** What the model read, verbatim. */
  raw: string | null
  flags: string[]
}

export interface CccdExtractResult {
  doc_type: "cccd"
  card_version: CardVersion
  fields: Record<CccdFieldName, ExtractedField>
  warnings: string[]
  model: string
  model_location: ModelLocation
}

export interface DocumentCapabilities {
  doc_types: string[]
  model_location: ModelLocation
}

export type Severity = "error" | "warning" | "info"

export type ExtractErrorKind =
  | "not_document"
  | "too_large"
  | "unsupported"
  | "timeout"
  | "unavailable"
  | "bad_output"
  | "forbidden"
  | "unknown"
