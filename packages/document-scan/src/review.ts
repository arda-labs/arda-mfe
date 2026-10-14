import { CCCD_FIELDS, type CccdExtractResult, type CccdFieldName, type Severity } from "./types"

const SEVERITY: Record<string, Severity> = {
  invalid_format: "error",
  mismatch_id_number: "error",
  invalid_date: "error",
  date_order: "error",
  unknown_province_code: "warning",
  expiry_inconsistent: "warning",
  expired: "warning",
  not_found: "info",
  no_expiry: "info",
}

const RANK: Record<Severity, number> = { info: 0, warning: 1, error: 2 }

export function flagSeverity(flag: string): Severity {
  return SEVERITY[flag] ?? "warning"
}

export function fieldSeverity(flags: string[]): Severity | null {
  let worst: Severity | null = null
  for (const flag of flags) {
    const s = flagSeverity(flag)
    if (!worst || RANK[s] > RANK[worst]) worst = s
  }
  return worst
}

export function initialValues(result: CccdExtractResult): Record<CccdFieldName, string> {
  return Object.fromEntries(CCCD_FIELDS.map((f) => [f, result.fields[f].value ?? ""])) as Record<CccdFieldName, string>
}

/** Error-level fields the user has neither edited nor explicitly kept. */
export function blockingFields(
  result: CccdExtractResult,
  values: Record<CccdFieldName, string>,
  kept: ReadonlySet<CccdFieldName>
): CccdFieldName[] {
  return CCCD_FIELDS.filter((f) => {
    const field = result.fields[f]
    if (fieldSeverity(field.flags) !== "error" || kept.has(f)) return false
    return values[f] === (field.value ?? "")
  })
}

/** Fields where applying would replace a different, non-empty form value. */
export function computeOverwrites(
  values: Record<CccdFieldName, string>,
  existing: Partial<Record<CccdFieldName, string>>
): CccdFieldName[] {
  return CCCD_FIELDS.filter((f) => {
    const current = existing[f]?.trim()
    return !!current && !!values[f] && current !== values[f]
  })
}
