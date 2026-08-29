# AGENTS.md — Arda MFE Agent & Developer Guide

Tài liệu hướng dẫn toàn diện dành cho các AI Agent (Antigravity, Cursor, Copilot) và Kỹ sư phát triển khi làm việc với Monorepo **Arda MFE**.

---

## 1. Tổng quan Kiến trúc Micro-Frontend (MFE Architecture)

Arda MFE sử dụng mô hình **Vite + Module Federation + Bun** gồm 1 Host Shell và 7 Remote Micro-frontends độc lập:

| App / Remote | Cổng Dev | Route Prefix | Chức năng chính |
| :--- | :---: | :--- | :--- |
| **`shell`** | `5000` | `/*` | Host container, xác thực, điều hướng layout, nạp dynamic remotes |
| **`iam`** | `5101` | `/admin/*` | Quản trị IAM: Users, Groups, Roles, Permissions, Audit |
| **`platform`** | `5102` | `/admin/*` | Master data: Organizations, Parameters, Lookups, Geo, Templates |
| **`finance`** | `5103` | `/finance/*` | Kế toán: Accounts, Transactions, Approvals, Trial balance |
| **`account`** | `5104` | `/my-account/*`, `/settings/*`, `/in/*` | Quản lý Profile, Security, Sessions, Devices, Appearance |
| **`hrm`** | `5105` | `/hrm/*` | Quản trị nhân sự: Positions, Job Titles, Org Units, Employees |
| **`workflow`** | `5106` | `/workflow/*` | Quy trình & BPMN: Case Types, SLA, Roles, Zeebe 8.5 Monitoring |
| **`crm`** | `5107` | `/customers/*`, `/workbench/*` | Quản lý khách hàng hội viên, bàn làm việc xử lý giao dịch |

---

## 2. Quy tắc Bắt buộc trong Module Federation (Strict Rules)

### 2.1. Đồng bộ Singleton trong `federation.shared.ts`
* Tất cả cấu hình chia sẻ thư viện dùng chung **phải khai báo tại `federation.shared.ts`** ở thư mục gốc.
* **Tuyệt đối không sửa riêng lẻ `shared` trong từng `apps/<remote>/vite.config.ts`**.
* Các thư viện bắt buộc là singleton: `react`, `react-dom`, `react-router-dom`, `@workspace/auth`, `@workspace/theme`, `@workspace/notifications`, `@workspace/i18n`, `react-toastify`.
* **Chính sách share đã được tự động hoá**: `bun run check:federation` fail khi một package `@workspace/*` được ≥2 deployment unit import mà vừa không nằm trong `remoteSharedDeps`, vừa không có lý do trong `sharedWorkspaceExemptions`. Package mới muốn chỉ-dùng-shell hoặc per-remote → khai báo exemption kèm justification tại `federation.shared.ts`.
* Mỗi remote mount `QueryProvider` (`@workspace/query/provider`) ở gốc `src/Routes.tsx` để server-list dùng `@workspace/admin-list` hoạt động mọi nơi mà không cần wiring từng page.

### 2.2. Chuẩn hoá Remote Router với `createRemoteRoutes`
* Mọi remote đều export một file duy nhất `src/Routes.tsx` (ví dụ `apps/platform/src/Routes.tsx`) qua Module Federation `exposes: { "./Routes": "./src/Routes.tsx" }`.
* Sử dụng factory `createRemoteRoutes` từ `@workspace/ui/lib/lazy`:
  ```tsx
  import "@workspace/i18n/apps/platform"
  import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

  const OrgsPage = lazyWithPreload(() => import("@/features/platform/organizations/page"))
  const ParametersPage = lazyWithPreload(() => import("@/features/platform/parameters/page"))

  export default createRemoteRoutes({
    routes: [
      { prefix: "/admin/organizations", component: OrgsPage },
      { prefix: "/admin/parameters", component: ParametersPage },
    ],
    defaultComponent: OrgsPage,
  })
  ```
* Host Shell luôn bọc các Remote Routes bên trong `<RemoteErrorBoundary>` để cô lập sự cố khi remote gặp lỗi mạng.

### 2.3. Tenant context từ BFF session

* `/api/auth/me` trả về user đã xác thực kèm `tenantMemberships` và `activeTenantId`. Frontend đổi tenant qua `POST /api/auth/tenant/switch` — **không bao giờ gửi `X-Tenant-Id` như authority header**.
* Sau khi switch thành công, auth store thay toàn bộ user context; mọi API call sau đó dùng active tenant phía server. Roles, permissions, groups, organizations đều lấy từ context đó.
* Quyền global tách riêng: `globalRoles`, `globalPermissions`, `isGlobalAdmin`. Được dùng cho navigation và màn hình access-denied, nhưng **không** dùng để tạo authorization header hay suy ra target tenant ID.
* Mọi call cookie-backed (`/api/auth/me`, tenant switch, logout) phải giữ `credentials: "include"` và dùng cùng origin resolver, để cookie BFF tới được `api.arda.io.vn` ở production.
* Khi gặp 403: giữ nguyên `code` và `request_id` từ API, tránh logout loop, chỉ đề nghị switch tenant nếu user có membership khác đã verified.

---

## 3. Quy chuẩn Tổ chức Code & Cấu trúc Thư mục (Code Conventions)

```text
apps/<remote>/src/
├── features/<domain>/
│   ├── api.ts                     <-- API client riêng của domain
│   ├── <feature-name>/
│   │   ├── schema.ts              <-- Zod validation schemas & form default values
│   │   ├── page.tsx               <-- Main page (Target ≤ 300-400 lines)
│   │   └── components/            <-- Các Dialog, Drawer, Table views tách rời
│   │       ├── CreateDialog.tsx
│   │       ├── EditDialog.tsx
│   │       └── TableView.tsx
├── Routes.tsx                     <-- Remote entrypoint cho Module Federation
└── main.tsx                       <-- Standalone dev harness
```

### 3.1. Quy tắc phân rã file:
* **Không viết file nguyên khối (Monolithic Mega-file):** Mục tiêu `page.tsx` ≤ 400 dòng. Gate `check:pages` chỉ áp dụng cho file mới; một số page cũ lớn hơn (760–850 dòng) nằm trong `LEGACY_BASELINE` của `scripts/check-page-size.mjs` với mốc giải tỏa Q4-2026/Q1-2027 — khi chạm vào các file này, tách nhỏ trước khi mở rộng thêm.
* **Tách Zod Schema ra `schema.ts`:** Không khai báo Zod schema, interface form values và default values trực tiếp trong file UI.
* **Tách Form / View Dialogs vào `components/`:** Mỗi dialog xử lý một nghiệp vụ riêng (Create, Edit, Roles, Audit, Sessions).

---

## 4. Hệ thống Đa ngôn ngữ (i18n)

* **Hook sử dụng:** Luôn dùng `useI18n()` từ `@workspace/i18n`. Không dùng `useTranslation()`.
* **Cơ chế nạp tĩnh (Bundled):** Mỗi remote import từ điển của mình tại đầu `Routes.tsx`: `import "@workspace/i18n/apps/<app>"`.
* **Quy ước key navigation:** Các menu cha có các menu con cấp dưới sử dụng quy ước `_self` (ví dụ: `nav.workbench` ➔ `navigation:workbench._self`). Hàm `translate()` đã được bọc an toàn để không bao giờ trả về raw object cho React render.

---

## 5. Lệnh Phát triển & Kiểm thử (Commands)

```bash
# Cài đặt dependencies (sử dụng bun 1.3.14+)
bun install

# Kiểm tra ranh giới package (Package boundaries & no circular deps)
bun run check:packages

# Kiểm tra TypeScript toàn bộ monorepo (18 workspaces: 8 apps + 10 packages)
# Bao gồm các invariant: check:packages, check:credentials, check:fallbacks,
# check:federation (chính sách shared deps tự động), check:pages (giới hạn
# độ dài page.tsx với LEGACY_BASELINE cho debt cũ)
bun run typecheck

# Kiểm tra ESLint
bun run lint

# Build production toàn bộ 8 apps
bun run build

# Build từng app cho Cloudflare Workers
bun run cf:build <app_name>     # ví dụ: bun run cf:build shell
bun run cf:deploy <app_name>
```

> [!IMPORTANT]
> Khi thêm hoặc cập nhật dependencies, luôn chạy `bun install` và commit file `bun.lock`. CI/CD deploy trên Cloudflare sử dụng cờ `--frozen-lockfile`.

---

## 6. Môi trường Dev & Local Auth Simulation

Do hệ thống backend OAuth/Ory Kratos không có chế độ mock trong môi trường local sandbox:
1. Chạy Host Shell: `bun run --filter shell dev` (:5000). Shell reverse-proxy tất cả `/api/*` về `http://localhost:8082`.
2. Chạy Remote cần phát triển: `bun run --filter platform dev` (:5102).
3. Đảm bảo cổng `8082` trả về user info hợp lệ cho endpoint `GET /api/auth/me` (`roles: ["SUPER_ADMIN"]`, `permissions: ["superadmin"]`) để vượt qua `AuthGuard`.

---

## 7. Tài liệu chi tiết theo chủ đề

Khi làm việc sâu vào một mảng, đọc convention tương ứng trước:

| Chủ đề | Tài liệu |
| :--- | :--- |
| i18n, locale, format ngày/số | [`docs/conventions/i18n-and-localization.md`](docs/conventions/i18n-and-localization.md) |
| Toast, notification bell, inbox | [`docs/conventions/notifications-and-toasts.md`](docs/conventions/notifications-and-toasts.md) |
| List server-side (search/filter/paging) | [`docs/conventions/server-list-migration.md`](docs/conventions/server-list-migration.md) |
| Xuất dữ liệu (Excel/CSV) | [`docs/conventions/data-export.md`](docs/conventions/data-export.md) |
| Xem trước file, upload media | [`docs/conventions/file-preview.md`](docs/conventions/file-preview.md) |
| Tích hợp AI panel Olorin | [`docs/ai-integration-guide.md`](docs/ai-integration-guide.md) |
| Trạng thái refactor đang chạy | [`docs/refactor-program.md`](docs/refactor-program.md) |

Kiến trúc backend, hợp đồng API và `policy.yaml` nằm ở repo `arda-be` — xem `arda-be/AGENTS.md`.

---

## 8. AI assistant (Olorin) UI knowledge

* `@workspace/ai` exports: `OlorinProvider` (CopilotKit v2 headless, runtime
  URL = `apiUrl() + "/api/copilotkit"`, credentials include), `OlorinPanel`
  (props: `className`, `fixtureKey`, `showHeader` - set false inside
  workspace), `OlorinWorkspace` (full-screen dialog, ChatGPT-style thread
  sidebar, Escape to exit, prop `onExit`), `useOlorin` (send/newThread/
  switchToThread), `useOlorinConversations`.
* Shell integration lives in `apps/shell/src/ShellLayout.tsx`: state
  `aiView: "closed" | "panel" | "full"`. Header "Ask AI" toggles panel; the
  panel header has expand (Maximize2 -> full) and close buttons; resize handle
  persists width in localStorage `arda-ai-panel-width`; Ctrl/Cmd+J toggles.
* React Compiler lint (`react-hooks/immutability`) forbids mutating hook-owned
  objects (e.g. `agent.threadId = x`). Use module-scope helper functions that
  perform the assignment instead.
* Locale JSON files contain Vietnamese text: NEVER edit them via PowerShell
  `Set-Content/-Encoding UTF8` (mojibake/BOM). Use the Edit tool or a small
  `node -e` fs script.
* When adding dependencies to any package: run `bun install` and COMMIT the
  root `bun.lock` in the same PR - Cloudflare Workers Builds runs
  `bun install --frozen-lockfile` and fails otherwise.
