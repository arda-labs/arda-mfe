# Hướng Dẫn Cấu Hình Build & Deploy Cloudflare Workers (Monorepo)

> **⚠️ Note:** This file lives in `docs/archive/` but its content is still applicable — the 8 Workers described here are actively deployed. The archive placement is historical (superseded by automated Cloudflare Workers Builds integration).

Tài liệu này mô tả chi tiết cách thiết lập build và deploy 8 Cloudflare Workers cho hệ thống `arda-mfe` trên Cloudflare Dashboard.

---

## 1. Cấu Trúc Các Workers

Hệ thống Micro-Frontend gồm có 9 Workers phân tán:
1. `arda-shell` (Host container điều phối routing & layout)
2. `arda-mfe-crm` (Customer Relationship Management)
3. `arda-mfe-iam` (Identity & Access Management)
4. `arda-mfe-platform` (Core Platform & Catalogs)
5. `arda-mfe-finance` (Finance & Accounting)
6. `arda-mfe-account` (User Profile & Account Settings)
7. `arda-mfe-hrm` (Human Resource Management)
8. `arda-mfe-workflow` (Workflow & Zeebe BPM Monitoring)
9. `arda-mfe-ai` (AI Center & Knowledge Base)

---

## 2. Cấu Hình Build Watch Paths Trên Cloudflare Dashboard

Để tránh việc Cloudflare kích hoạt build đồng loạt cả 8 Workers khi chỉ có thay đổi ở Backend (`arda-be`) hoặc một App MFE đơn lẻ, cần thiết lập **Build watch paths** như sau:

> **Lưu ý:** Cấu hình dưới đây áp dụng khi đặt **Root directory** trên Cloudflare là: `arda-mfe`.

### 1. `arda-mfe-crm`
* **Build Command:** `bun run cf:build crm`
* **Build Output Directory:** `.cloudflare/dist/crm`
* **Include paths:**
  ```text
  apps/crm/**, packages/**, cloudflare/wrangler.crm.jsonc, scripts/**, package.json, bun.lock
  ```
* **Exclude paths:**
  ```text
  apps/account/**, apps/finance/**, apps/hrm/**, apps/iam/**, apps/platform/**, apps/shell/**, apps/workflow/**, ../arda-be/**, ../arda-infra/**, ../arda-perf/**, **/*.md
  ```

---

### 2. `arda-mfe-iam`
* **Build Command:** `bun run cf:build iam`
* **Build Output Directory:** `.cloudflare/dist/iam`
* **Include paths:**
  ```text
  apps/iam/**, packages/**, cloudflare/wrangler.iam.jsonc, scripts/**, package.json, bun.lock
  ```
* **Exclude paths:**
  ```text
  apps/account/**, apps/crm/**, apps/finance/**, apps/hrm/**, apps/platform/**, apps/shell/**, apps/workflow/**, ../arda-be/**, ../arda-infra/**, ../arda-perf/**, **/*.md
  ```

---

### 3. `arda-mfe-platform`
* **Build Command:** `bun run cf:build platform`
* **Build Output Directory:** `.cloudflare/dist/platform`
* **Include paths:**
  ```text
  apps/platform/**, packages/**, cloudflare/wrangler.platform.jsonc, scripts/**, package.json, bun.lock
  ```
* **Exclude paths:**
  ```text
  apps/account/**, apps/crm/**, apps/finance/**, apps/hrm/**, apps/iam/**, apps/shell/**, apps/workflow/**, ../arda-be/**, ../arda-infra/**, ../arda-perf/**, **/*.md
  ```

---

### 4. `arda-mfe-finance`
* **Build Command:** `bun run cf:build finance`
* **Build Output Directory:** `.cloudflare/dist/finance`
* **Include paths:**
  ```text
  apps/finance/**, packages/**, cloudflare/wrangler.finance.jsonc, scripts/**, package.json, bun.lock
  ```
* **Exclude paths:**
  ```text
  apps/account/**, apps/crm/**, apps/hrm/**, apps/iam/**, apps/platform/**, apps/shell/**, apps/workflow/**, ../arda-be/**, ../arda-infra/**, ../arda-perf/**, **/*.md
  ```

---

### 5. `arda-mfe-account`
* **Build Command:** `bun run cf:build account`
* **Build Output Directory:** `.cloudflare/dist/account`
* **Include paths:**
  ```text
  apps/account/**, packages/**, cloudflare/wrangler.account.jsonc, scripts/**, package.json, bun.lock
  ```
* **Exclude paths:**
  ```text
  apps/crm/**, apps/finance/**, apps/hrm/**, apps/iam/**, apps/platform/**, apps/shell/**, apps/workflow/**, ../arda-be/**, ../arda-infra/**, ../arda-perf/**, **/*.md
  ```

---

### 6. `arda-mfe-hrm`
* **Build Command:** `bun run cf:build hrm`
* **Build Output Directory:** `.cloudflare/dist/hrm`
* **Include paths:**
  ```text
  apps/hrm/**, packages/**, cloudflare/wrangler.hrm.jsonc, scripts/**, package.json, bun.lock
  ```
* **Exclude paths:**
  ```text
  apps/account/**, apps/crm/**, apps/finance/**, apps/iam/**, apps/platform/**, apps/shell/**, apps/workflow/**, ../arda-be/**, ../arda-infra/**, ../arda-perf/**, **/*.md
  ```

---

### 7. `arda-mfe-workflow`
* **Build Command:** `bun run cf:build workflow`
* **Build Output Directory:** `.cloudflare/dist/workflow`
* **Include paths:**
  ```text
  apps/workflow/**, packages/**, cloudflare/wrangler.workflow.jsonc, scripts/**, package.json, bun.lock
  ```
* **Exclude paths:**
  ```text
  apps/account/**, apps/crm/**, apps/finance/**, apps/hrm/**, apps/iam/**, apps/platform/**, apps/shell/**, ../arda-be/**, ../arda-infra/**, ../arda-perf/**, **/*.md
  ```

---

### 8. `arda-shell`
* **Build Command:** `bun run cf:build shell`
* **Build Output Directory:** `.cloudflare/dist/shell`
* **Include paths:**
  ```text
  apps/shell/**, packages/**, cloudflare/wrangler.shell.jsonc, cloudflare/shell-worker.ts, scripts/**, package.json, bun.lock
  ```
* **Exclude paths:**
  ```text
  apps/account/**, apps/crm/**, apps/finance/**, apps/hrm/**, apps/iam/**, apps/platform/**, apps/workflow/**, apps/ai/**, ../arda-be/**, ../arda-infra/**, ../arda-perf/**, **/*.md
  ```

---

### 9. `arda-mfe-ai`
* **Build Command:** `bun run cf:build ai`
* **Build Output Directory:** `.cloudflare/dist/ai`
* **Include paths:**
  ```text
  apps/ai/**, packages/**, cloudflare/wrangler.ai.jsonc, scripts/**, package.json, bun.lock
  ```
* **Exclude paths:**
  ```text
  apps/account/**, apps/crm/**, apps/finance/**, apps/hrm/**, apps/iam/**, apps/platform/**, apps/shell/**, apps/workflow/**, ../arda-be/**, ../arda-infra/**, ../arda-perf/**, **/*.md
  ```
