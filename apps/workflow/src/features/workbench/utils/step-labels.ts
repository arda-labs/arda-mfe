export function stepLabel(value: string) {
  const labels: Record<string, string> = {
    submitted: "Đã khởi tạo",
    Activity_CheckerReview: "Phê duyệt hồ sơ khách hàng",
    Activity_MakerRevise: "Chỉnh sửa hồ sơ",
    Activity_RiskReview: "Rà soát rủi ro khách hàng",
    Activity_ApproveCustomer: "Kích hoạt hồ sơ khách hàng",
    "classify-account": "Phân loại tài khoản",
    "approve-journal": "Duyệt bút toán",
    "verify-beneficiary": "Kiểm tra người nhận",
    "workflow.finance_incoming_classify": "Phân loại giao dịch đến",
    "workflow.finance_incoming_approve": "Duyệt giao dịch đến",
    "workflow.finance_outgoing_verify": "Kiểm tra giao dịch đi",
    "workflow.finance_outgoing_approve": "Duyệt giao dịch đi",
    "workflow.customer_checker_review": "Phê duyệt hồ sơ khách hàng",
    "workflow.customer_maker_revise": "Chỉnh sửa hồ sơ",
    "workflow.hrm_registration_review": "Kiểm tra hồ sơ nhân sự",
    "workflow.hrm_registration_approve": "Phê duyệt tiếp nhận nhân sự",
  }
  return labels[value] ?? value
}

export function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export function completionTime(item: {
  completedAt?: string
  status?: string
  transactionStatus?: string
  updatedAt: string
}) {
  if (item.completedAt) return formatDateTime(item.completedAt)
  if (item.status === "COMPLETED" || item.transactionStatus === "COMPLETED") {
    return formatDateTime(item.updatedAt)
  }
  return "-"
}

export function previousAssignee(item: {
  previousAssignedTo?: string
  previousAssignedToName?: string
  variables?: Record<string, unknown>
}) {
  if (item.previousAssignedToName) return item.previousAssignedToName
  if (item.previousAssignedTo) return item.previousAssignedTo
  const variables = item.variables ?? {}
  const value = variables.previousAssignee ?? variables.previousAssignedTo
  return typeof value === "string" && value ? value : "Chưa có"
}

export function stepLabelOrDefault(value: string) {
  return stepLabel(value)
}
