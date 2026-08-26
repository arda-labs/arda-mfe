export type FixtureMessage = {
  id: string
  role: "user" | "assistant" | "tool"
  content: string
}

export type OlorinFixtures = Record<string, FixtureMessage[]>

const customerResult = {
  id: "0198b7a2-4c1d-7e3f-9a2b-5d6c8e0f1a2b",
  customerCode: "CUS-2026-0148",
  name: "Công ty TNHH Minh Phát",
  customerType: "organization",
  status: "ACTIVE",
  segment: "chuan",
  rank: "A",
  riskLevel: "low",
  orgId: "org-hcm-01",
  updatedAt: "2026-08-20T09:12:00Z",
}

const knowledgeResult = {
  query: "quy trình phê duyệt công nợ",
  items: [
    {
      sourceId: "0198b7a2-4c1d-7e3f-9a2b-5d6c8e0f1a2c",
      sourceKey: "finance/approval-matrix",
      title: "Ma trận phê duyệt công nợ",
      version: "2026.2",
      heading: "Ngưỡng phê duyệt",
      content:
        "Khoản phải thu trên 500 triệu VND cần hai cấp phê duyệt: trưởng bộ phận tài chính rồi giám đốc khối.",
      sourceType: "policy",
    },
  ],
  citations: [
    {
      sourceId: "0198b7a2-4c1d-7e3f-9a2b-5d6c8e0f1a2c",
      sourceKey: "finance/approval-matrix",
      title: "Ma trận phê duyệt công nợ",
      version: "2026.2",
      heading: "Ngưỡng phê duyệt",
    },
  ],
}

export const olorinFixtures: OlorinFixtures = {
  welcome: [
    {
      id: "fixture-welcome-user",
      role: "user",
      content: "Olorin có thể làm gì trong tenant này?",
    },
    {
      id: "fixture-welcome-assistant",
      role: "assistant",
      content:
        "Trong tenant hiện tại tôi có thể tra cứu khách hàng CRM và tìm kiếm tri thức nội bộ đã được duyệt. Mọi hành động thay đổi dữ liệu đều cần bạn phê duyệt trước khi thực hiện.",
    },
  ],
  customerLookup: [
    {
      id: "fixture-customer-user",
      role: "user",
      content: "Xem thông tin khách hàng CUS-2026-0148",
    },
    {
      id: "fixture-customer-tool",
      role: "tool",
      content: JSON.stringify(customerResult),
    },
    {
      id: "fixture-customer-assistant",
      role: "assistant",
      content:
        "Công ty TNHH Minh Phát (CUS-2026-0148) đang hoạt động, phân khúc chuẩn, xếp hạng A và mức độ rủi ro thấp.",
    },
  ],
  knowledgeCitations: [
    {
      id: "fixture-knowledge-user",
      role: "user",
      content: "Quy trình phê duyệt công nợ thế nào?",
    },
    {
      id: "fixture-knowledge-tool",
      role: "tool",
      content: JSON.stringify(knowledgeResult),
    },
    {
      id: "fixture-knowledge-assistant",
      role: "assistant",
      content:
        "Theo ma trận phê duyệt công nợ bản 2026.2, khoản phải thu trên 500 triệu VND cần hai cấp phê duyệt: trưởng bộ phận tài chính rồi giám đốc khối.",
    },
  ],
}
