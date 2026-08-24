# Arda MFE Architecture & Implementation Guide

Monorepo tài liệu hóa chi tiết kiến trúc kỹ thuật của hệ thống **Arda Micro-Frontend (MFE)**.

---

## 1. Topology & Port Registry

Hệ thống được thiết kế theo mô hình **Distributed Micro-Frontends** với 1 Host Container (Shell) và 7 Remote Micro-frontends.

```
                    ┌─────────────────────────┐
                    │      Shell (Host)       │
                    │       Port: 5000        │
                    │   Layout, Auth, Nav     │
                    └────────────┬────────────┘
                                 │
     ┌──────────┬──────────┬─────┴────┬──────────┬──────────┬──────────┐
     │          │          │          │          │          │          │
┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐
│  iam   │ │platform│ │finance │ │account │ │   hrm  │ │workflow│ │  crm   │
│ :5101  │ │ :5102  │ │ :5103  │ │ :5104  │ │ :5105  │ │ :5106  │ │ :5107  │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

---

## 2. Core Architectural Principles

### 2.1. Single Source of Shared Dependencies
Toàn bộ hợp đồng chia sẻ (shared dependencies) giữa Host và các Remote được quản lý tập trung tại [`federation.shared.ts`](file:///d:/github/arda/arda-mfe/federation.shared.ts).
- Các thư viện React và UI Core (`react`, `react-dom`, `react-router-dom`, `react-toastify`) bắt buộc phải là **Singleton** để tránh hiện tượng duplicate context hoặc render lỗi.
- Các internal packages (`@workspace/auth`, `@workspace/theme`, `@workspace/notifications`, `@workspace/i18n`, `@workspace/api`) được chia sẻ singleton để đồng bộ trạng thái đăng nhập, theme và thông báo realtime trên toàn bộ màn hình.

### 2.2. Dynamic Route Resolution & Lazy Preloading
- Mỗi remote export một entry duy nhất `./Routes` thông qua hàm tiện ích [`createRemoteRoutes()`](file:///d:/github/arda/arda-mfe/packages/ui/src/lib/lazy.ts).
- Shell nạp remote động khi người dùng điều hướng URL.
- Shell tích hợp [`RemoteErrorBoundary`](file:///d:/github/arda/arda-mfe/apps/shell/src/components/RemoteErrorBoundary.tsx) bao bọc từng remote để đảm bảo khi 1 micro-frontend gặp sự cố mạng hoặc lỗi runtime, toàn bộ giao diện Host Shell và các tính năng khác vẫn hoạt động bình thường.

---

## 3. Package Layering & Boundaries

```text
packages/
├── api/            <-- HTTP client, URL resolver, base REST transport
├── auth/           <-- Authentication store (Zustand), AuthGuard, MFA Step-Up
├── notifications/  <-- Realtime notification bell, inbox stream & toast
├── theme/          <-- Dark/Light appearance, branding configuration
├── i18n/           <-- Multi-language dictionaries (vi-VN, en-US) & useI18n hook
├── ui/             <-- Shared Radix UI components, Dialogs, Tables, Form fields
├── admin-list/     <-- Generic URL search/filter/table state orchestration
├── query/          <-- TanStack Query client & cache provider
└── media/          <-- Media upload & URL helpers
```

Ranh giới giữa các package được kiểm tra tự động bởi script `bun run check:packages`. Các packages tuyệt đối không được tạo vòng lặp phụ thuộc (circular dependencies).

---

## 4. Code Structuring & Modularity Standards

Để tránh tình trạng file quá dài gây khó khăn cho việc bảo trì, mỗi module nghiệp vụ cần tuân thủ cấu trúc phân rã chuẩn:

```text
apps/<app-name>/src/features/<domain>/<feature>/
├── schema.ts            <-- Chứa Zod schema, interface form values, default values
├── page.tsx             <-- View chính (kết nối Table, Search, Header). Target ≤ 400 lines
└── components/          <-- Các thành phần con tách rời
    ├── CreateDialog.tsx
    ├── EditDialog.tsx
    └── TableView.tsx
```

---

## 5. Build & Deployment Lifecycle

* **Local Development:** Sử dụng Bun để chạy song song: `bun run dev` (hoặc chạy độc lập từng remote kết hợp với Shell).
* **CI/CD Deployment (Cloudflare Pages):**
  - Mỗi ứng dụng được đóng gói độc lập thông qua script: `bun run cf:build <app_name>`.
  - Toàn bộ dependencies được khóa chặt và xác thực với `bun install --frozen-lockfile`.
