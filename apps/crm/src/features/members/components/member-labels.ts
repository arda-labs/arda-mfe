type TranslateFn = (key: string) => string

/** Member type labels: the row value is a closed VARCHAR (INDIVIDUAL|HOUSEHOLD|
 * LEGAL), so an unknown code is shown verbatim instead of guessed. */
export function memberTypeLabel(t: TranslateFn, code: string): string {
  if (code === "INDIVIDUAL") return t("members.type.individual")
  if (code === "HOUSEHOLD") return t("members.type.household")
  if (code === "LEGAL") return t("members.type.legal")
  return code
}

/** Member status labels (ACTIVE|LEFT). */
export function memberStatusLabel(t: TranslateFn, status: string): string {
  if (status === "ACTIVE") return t("members.status.active")
  if (status === "LEFT") return t("members.status.left")
  return status
}

/** Capital request kinds (REGISTER|ADDITIONAL|WITHDRAW). */
export function requestTypeLabel(t: TranslateFn, kind: string): string {
  if (kind === "REGISTER") return t("members.request.register")
  if (kind === "ADDITIONAL") return t("members.request.additional")
  if (kind === "WITHDRAW") return t("members.request.withdraw")
  return kind
}

/** Request lifecycle labels (DRAFT|SUBMITTED|APPROVED|REJECTED). */
export function requestStatusLabel(t: TranslateFn, status: string): string {
  if (status === "DRAFT") return t("members.request.status.draft")
  if (status === "SUBMITTED") return t("members.request.status.submitted")
  if (status === "APPROVED") return t("members.request.status.approved")
  if (status === "REJECTED") return t("members.request.status.rejected")
  return status
}

/** Money is int64 minor units; VND has no decimals, so render exactly. */
export function formatMinor(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value ?? 0)
}
