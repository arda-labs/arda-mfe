import type { LoanFormationStepCode } from "../../api"

/**
 * Stage semantics của BPMN lnm-loan-formation-v2 (EPAS LNM.201.01): tabs cộng
 * dồn — "Hồ sơ đề nghị" luôn có, "Thẩm định" mở từ UT_TWRevalidate, "Phê duyệt"
 * mở từ UT_PGDReview; "Hợp đồng" là tab cuối (snapshot). Stage order cũng xác
 * định tab mặc định: stage hiện tại là tab sâu nhất đã mở.
 */
export const FORMATION_STEPS: LoanFormationStepCode[] = [
  "UT_MakerInput",
  "UT_TWRevalidate",
  "UT_PGDReview",
  "UT_GDReview",
  "UT_BoardReview",
]

/** Tab hiển thị form editable cho từng stage (null = review-only stage). */
export function stepEditableTab(step: LoanFormationStepCode) {
  switch (step) {
    case "UT_MakerInput":
      return "proposal" as const
    case "UT_TWRevalidate":
      return "appraisal" as const
    default:
      return "approval" as const
  }
}

export function stageLabelKey(stage: LoanFormationStepCode | null) {
  return stage
    ? `loan.formation.stage.${stage}`
    : "loan.formation.stage.unknown"
}

export function stepIndex(step: LoanFormationStepCode) {
  return FORMATION_STEPS.indexOf(step)
}

/** Bậc phê duyệt hiển thị trên tab Phê duyệt (PGD/GD/Board). */
export function approvalTierOf(
  step: LoanFormationStepCode
): "PGD" | "GD" | "BOARD" {
  switch (step) {
    case "UT_GDReview":
      return "GD"
    case "UT_BoardReview":
      return "BOARD"
    default:
      return "PGD"
  }
}

/**
 * Đọc số từ case variables (Zeebe trả mọi thứ dạng JSON: amount là số,
 * còn lại có thể string hoá) — không đoán: chỉ ép khi parse được.
 */
export function numericVariable(
  variables: Record<string, unknown>,
  key: string
): number | null {
  const raw = variables[key]
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function stringVariable(
  variables: Record<string, unknown>,
  key: string
): string {
  const raw = variables[key]
  if (typeof raw === "string") return raw
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw)
  return ""
}
