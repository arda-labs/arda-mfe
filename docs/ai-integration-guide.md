# MFE Integration Guide — Olorin AI Panel

Status: **Integration specification for domain MFE teams**.
Covers how apps in `arda-mfe/apps/*` integrate with `packages/ai` to provide
context, register tool renderers, and add frontend-only actions.

---

## 1. Overview

The Olorin AI assistant (`packages/ai`) exposes three integration points for
domain MFEs:

```
┌──────────────────────────────────────────────────────────┐
│  Domain MFE (e.g. apps/crm)                             │
│                                                          │
│  1. registerOlorinContext()   → push UI state to AI      │
│  2. registerToolRenderer()   → custom result card        │
└──────────────────────────────────────────────────────────┘
```

All three are purely additive. Domain MFEs do not need to modify `packages/ai`
core code or the backend `ai-service`.

The chat itself is driven by the official assistant-ui AG-UI runtime
(`useAgUiRuntime` + `HttpAgent`); `packages/ai` only wires the runtime to our
Go agent endpoint and adds domain renderers.

---

## 2. Integration Point 1: Contributing UI Context

When a user is on a specific screen (e.g., a customer detail page), you can
push relevant IDs and labels into Olorin's context so the assistant can refer
to "the current customer" without the user having to type it out.

### API

```ts
import { registerOlorinContext } from "@workspace/ai"

// Call this once when the component mounts (or when relevant state changes)
const unregister = registerOlorinContext("crm.customer.active", () => ({
  activeCustomerId: customerId,
  activeCustomerName: customerName,
  activeCustomerCode: customerCode,
  currentScreen: "crm.customer.detail",
}))

// Call unregister() in the cleanup function (useEffect return or unmount)
```

### Rules for Context Contributors

1. **Return only display-safe, non-sensitive values.** IDs, names, codes, and
   screen identifiers are appropriate. Do not include tokens, permissions,
   financial amounts, or raw API responses.
2. **Keep context small.** The entire merged context is sent to the backend in
   `forwardedProps.ardaContext`. Target < 2 KiB total across all contributors.
3. **Contributor ID must be unique and namespaced** to your domain:
   `"crm.customer.active"`, `"hrm.employee.active"`, `"finance.invoice.active"`.
4. **Unregister on unmount.** Stale context from a previous screen is misleading.

### Example — CRM Customer Detail Page

```tsx
// apps/crm/src/features/customers/CustomerDetailPage.tsx
import { useEffect } from "react"
import { registerOlorinContext } from "@workspace/ai"

export function CustomerDetailPage({ customerId }: { customerId: string }) {
  const { data: customer } = useCustomer(customerId)

  useEffect(() => {
    if (!customer) return
    const unregister = registerOlorinContext("crm.customer.active", () => ({
      activeCustomerId: customer.id,
      activeCustomerName: customer.name,
      activeCustomerCode: customer.customerCode,
      activeCustomerStatus: customer.status,
      currentScreen: "crm.customer.detail",
    }))
    return unregister
  }, [customer?.id])

  return <div>...</div>
}
```

The AI can now answer "Khách hàng này đang ở trạng thái gì?" without the user
specifying which customer — the backend resolves `activeCustomerId` from context.

### Standard Context Keys (cross-domain convention)

| Key | Type | Description |
|:---|:---|:---|
| `currentScreen` | `string` | Route pathname (e.g. `/customers/adjustments`) |
| `activeCustomerId` | `string` | CRM customer UUID |
| `activeEmployeeId` | `string` | HRM employee UUID |
| `activeInvoiceId` | `string` | Finance invoice UUID |
| `activeCaseId` | `string` | Workflow case UUID |
| `activeWorkItemId` | `string` | Workflow work-item UUID |
| `userDisplayName` | `string` | Used by Olorin panel for avatar initials |
| `userLocale` | `string` | `"vi"` or `"en"` — affects AI response language hint |

The shell registers these from the deep link (`?customerId=…`, `?caseId=…`,
`?workItemId=…`) so task screens get record context without importing
`@workspace/ai`. Registering richer per-screen context (`registerOlorinContext`)
is available to shell code today; remotes can join once `@workspace/ai` leaves
the shell-only exemption in `federation.shared.ts`.

---

## 3. Integration Point 2: Custom Tool Result Renderers

When the AI calls a backend tool (direct or via Code Mode sandbox), the result
is rendered by a matching renderer. Register a domain-specific renderer to
display results as a rich card instead of raw JSON.

### API

```ts
import { registerToolRenderer, type ToolResultViewProps } from "@workspace/ai"

function MyResultCard({ result }: ToolResultViewProps) {
  // result is the parsed JSON object from the tool
  return <div>...</div>
}

// Register: returns an unregister function
const unregister = registerToolRenderer({
  id: "crm.invoice-list",          // Unique ID for this renderer
  match: (result) =>               // Return true if this renderer should handle the result
    Array.isArray(result.invoices) &&
    typeof result.totalCount === "number",
  component: MyResultCard,
})
```

### Renderer Matching Priority

Renderers are checked in registration order. The first `match(result) === true`
wins. Default renderers (`CustomerSummaryCard`, `KnowledgeCitationList`,
`EmployeeCard`, `FinanceAccountCard`, `InvoiceListCard`,
`KnowledgeSearchFeedback`) are
registered first — domain renderers registered later override the fallback
`GenericToolView` for matching shapes.

### Example — CRM Invoice List Renderer

```tsx
// packages/ai/src/components/crm-invoice-list.tsx (or apps/crm feature)
import { registerToolRenderer, type ToolResultViewProps } from "@workspace/ai"

type Invoice = {
  id: string
  number: string
  amount: number
  status: "PAID" | "OVERDUE" | "PENDING"
  dueDate: string
}

type InvoiceListResult = {
  invoices: Invoice[]
  totalCount: number
  currency: string
}

function isInvoiceListResult(result: unknown): result is InvoiceListResult {
  return (
    typeof result === "object" &&
    result !== null &&
    Array.isArray((result as InvoiceListResult).invoices) &&
    typeof (result as InvoiceListResult).totalCount === "number"
  )
}

export function InvoiceListCard({ result }: ToolResultViewProps) {
  if (!isInvoiceListResult(result)) return null
  return (
    <div className="mt-3 rounded-lg border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
        {result.totalCount} hóa đơn · {result.currency}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-1.5 text-left font-medium">Số HĐ</th>
            <th className="px-3 py-1.5 text-right font-medium">Giá trị</th>
            <th className="px-3 py-1.5 text-center font-medium">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {result.invoices.slice(0, 5).map((inv) => (
            <tr key={inv.id} className="border-b last:border-0">
              <td className="px-3 py-1.5 font-mono">{inv.number}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {inv.amount.toLocaleString("vi-VN")}
              </td>
              <td className="px-3 py-1.5 text-center">
                <StatusBadge status={inv.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Register when the CRM app initializes
export function registerInvoiceListRenderer() {
  return registerToolRenderer({
    id: "crm.invoice-list",
    match: (result) => isInvoiceListResult(result),
    component: InvoiceListCard,
  })
}
```

```tsx
// apps/crm/src/main.tsx or CRM app provider
import { registerToolRenderer } from "@workspace/ai"
import { registerInvoiceListRenderer } from "./renderers/invoice-list"

// Register once on app init
registerInvoiceListRenderer()
```

### Renderer Naming Convention

| Domain | ID format | Example |
|:---|:---|:---|
| CRM | `crm.<entity>-<view>` | `crm.customer-summary`, `crm.invoice-list` |
| HRM | `hrm.<entity>-<view>` | `hrm.employee-card`, `hrm.leave-balance` |
| Finance | `finance.<entity>-<view>` | `finance.ledger-entry`, `finance.budget-summary` |
| Workflow | `workflow.<entity>-<view>` | `workflow.case-status`, `workflow.task-list` |

---

## 4. Integration Point 3: Frontend Actions (via AG-UI A2UI actions)

For UI-only operations (filtering tables, scrolling to sections, opening
modals, filling forms), the AG-UI runtime exposes A2UI actions: the agent
emits `CUSTOM` / state events and the frontend reacts with
`useAgUiSendA2uiAction`. These tools **never touch the backend** — they are
pure UI event handlers that the AI can invoke.

> Note: this path is not yet exposed on the Go agent endpoint (roadmap
> §M4/MCP). Until then, UI-only operations are not available to the model —
> keep them as a future integration point.

### When to use frontend actions vs backend tools

| Scenario | Approach |
|:---|:---|
| Filter a data table by column | Frontend action (A2UI) — future |
| Navigate to a specific record | Frontend action (A2UI) — future |
| Pre-fill a form with suggested values | Frontend action (A2UI) — future |
| Read business data from the database | Backend tool via `ai-service` |
| Write / update a business record | Backend tool (confirm-kind, HITL) |
| Search knowledge documents | Backend tool (`knowledge.search`) |

### Frontend Action Naming Convention

```
<domain>.<entity>.<verb>
  crm.customerList.filter
  crm.customerList.sort
  crm.customerDetail.navigate
  hrm.employeeList.filter
  finance.invoiceList.export
  workflow.caseBoard.switchView
```

### Rules for Frontend Actions

1. **Never pass sensitive data as action return values.** Return confirmation
   strings only ("Đã lọc danh sách theo...").
2. **Validate parameters on the client.** The AI may pass unexpected values.
   Sanitize before applying to state.
3. **Actions are UI hints, not authoritative.** Never use them to perform
   backend mutations (API calls, form submissions). Use the Composer for that.
4. **Register only on the relevant page/component.** Unregister on unmount if
   the action only applies to a specific view.

---

## 4b. Interactive widgets (`renderWidget`)

When the backend flag `AI_ENABLE_SANDBOXED_UI` is on (default off), Olorin may
answer a "what-if" question with a small model-generated tool (HTML + CSS + JS)
instead of prose. Static display is unchanged: markdown, `renderChart` and the
report/tool cards cover it. With the flag off the model has no `renderWidget`
tool and nothing in this section applies.

`@workspace/ai` renders the tool with `WidgetFrame` (wrapped by `WidgetSlot`),
mounted through `RenderWidgetToolUI` in `OlorinPanel`.

### How it renders

```html
<iframe sandbox="allow-scripts" srcdoc="..." referrerpolicy="no-referrer" loading="lazy">
```

(Key attributes only; see `components/tools/widget-frame.tsx` for the full element.)

- The sandbox is exactly `allow-scripts`. Never add `allow-same-origin`,
  `allow-forms`, `allow-popups`, `allow-modals` or `allow-top-navigation`.
- The frame has an opaque origin: no cookies, no storage, no access to the
  parent DOM.
- The document (`buildWidgetDocument` in `lib/widget-host.ts`) starts with a
  `<meta>` CSP (`default-src 'none'; script-src 'unsafe-inline'; ...;
  connect-src 'none'; form-action 'none'`) that blocks fetch/XHR/WebSocket,
  external images, fonts, nested frames and form posts.
- Theme tokens (`--background`, `--primary`, `--chart-1..`) are injected from
  the shell theme. A theme change rebuilds the document and reloads the frame,
  so interactive state is lost.

### Protocol

| Direction | Message | Notes |
|:---|:---|:---|
| parent -> iframe | `{ type: "arda:data", data }` | sent once per iframe load, after the `load` event (model listeners are registered while parsing); the iframe sets `window.ARDA_DATA` and fires an `arda:data` event |
| iframe -> parent | `{ type: "arda:height", height }` | clamped to 160-720 px |
| iframe -> parent | `{ type: "arda:error", message }` | capped at 500 chars |

The parent accepts only those two inbound shapes (`parseWidgetMessage`) and
only when `event.source` is its own iframe's `contentWindow`. `arda:error` text
comes from model code and is untrusted: render it as a plain text child, never
as HTML. There is no channel for the widget to send text into the conversation.

Frame behavior: no `arda:height` within 5 s of sending the data shows "did not
respond" with a retry button; an `arda:error` shows a warning bar (text capped
at 200 chars) with a reload button and keeps the frame; at most 3 widgets are
mounted at once, page-wide (the oldest collapses to a "run again" card). This
limit applies through `WidgetSlot`; using `WidgetFrame` directly bypasses it. Expand is an
in-place height change (70vh), not a dialog.

### Data

The tool result carries either inline `data` (at most 64 KB) or a `result_id`
referring to an `execute()` result. For `result_id` the frame hydrates it with
`GET /api/ai/results/{id}?thread_id=` (`fetchExecuteResult` in `lib/results.ts`;
response envelope `{ success, result: { output } }`). Real ids look like
`tenant|actor|thread:hex`, so the id path segment is percent-encoded. The
endpoint is owner- and thread-scoped; a missing result returns 404
`ai.result_not_found`. On any fetch failure the UI shows a "could not load
data" box with the inputs summary instead of mounting a frame. Reopening a thread replays the
widget from the persisted result (same full payload as the live one).

### Security dependency on the shell header

The iframe CSP does **not** govern the frame's own navigation. `location.href`,
`<meta http-equiv="refresh">` and `<a href>` inside the widget are governed by
the **embedding page's** `frame-src`. Without a shell policy, a widget could
leak its data by navigating itself to an attacker URL. The shell Worker
therefore sends, on HTML documents:

```
Content-Security-Policy: frame-src 'self' blob:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'
```

- Source: `cloudflare/shell-csp.ts` (`SHELL_CSP`, `withShellCsp`); the Worker
  is invoked for HTML via `run_worker_first` in `cloudflare/wrangler.shell.jsonc`.
- Do not weaken the policy and do not remove `/*` from `run_worker_first`
  (the exclusions for `/assets/*`, `/locales/*`, `/remoteEntry-*` are for
  immutable static files only). If the Worker is bypassed, the header silently
  disappears. A dedicated widget origin, when added, must be added to
  `frame-src`.
- **Every** path that serves the shell HTML must send this same header: the
  Cloudflare Worker, and any alternative such as the `arda-infra` k8s frontend
  manifests if they are used to serve `arda.io.vn`. Only the Worker emits it
  today. Without it the sandbox has no protection against navigation
  exfiltration, and no unit test fails.
- Verify the header on a navigation request, against the real production
  hostname (not only a branch preview). In PowerShell use `curl.exe` (`curl` is
  an `Invoke-WebRequest` alias) and `findstr /i` (header names are lowercase over
  HTTP/2-3):
  `curl.exe -sI -H "Sec-Fetch-Mode: navigate" <shell url> | findstr /i content-security-policy`.
  Compare the value with `SHELL_CSP` and check both `/` and a deep SPA route.
- `tests/browser/widget-sandbox.spec.ts` (Playwright) runs a real attacker
  listener and tries `location.href`, meta refresh and anchor click. Each
  control (no header) reaches the attacker; the `location.href` and anchor
  variants carry the `ARDA_DATA` payload. With `SHELL_CSP` the browser blocks
  the navigation and the listener receives nothing. The tests serve
  `SHELL_CSP` through `page.route` and disable Chromium's Local Network Access
  checks via launch flags (the attacker is on loopback). They do not test the
  deployed Worker: use the curl check for that.

Side effects of `frame-src 'self' blob:`:

- External-URL PDFs that PDF.js cannot fetch (no CORS) and printing a
  non-same-origin source cannot use a hidden/visible iframe any more; they open
  in a new tab (`packages/ui` file-preview, `canFrameSource`). Top-level
  navigation is not governed by `frame-src`.
- `srcdoc` iframes are not subject to `frame-src` but inherit the embedding
  page's policy; this includes the notification design preview
  (`sandbox=""`, `apps/platform` design dialog).

### Known limits

- **WebRTC is a residual exfiltration channel.** `RTCPeerConnection` (for
  example a TURN `username`) is not covered by CSP `connect-src`. Nothing
  limits what the widget can send: it receives the whole `ARDA_DATA` payload
  (up to 64 KB inline, or a hydrated `execute()` result via `result_id`), which
  is tenant business data, and all of it can be exfiltrated this way today. The
  realistic trigger is prompt injection through tool or data content. The
  backend filter on `RTCPeerConnection` is trivially bypassable (string
  concatenation, aliases) and must not be relied on. The real mitigations are a
  dedicated widget origin with network egress controls (planned) and keeping the
  feature behind the `AI_ENABLE_SANDBOXED_UI` flag. No tokens, cookies or UI
  context are passed to the widget.
- The backend forbidden-pattern filter is **not** a security boundary. The
  boundary is the browser sandbox plus the two CSPs above.
- An infinite loop in widget JS can freeze the tab: a `srcdoc` frame may share
  a process with the shell. A script that never yields while the document is
  parsed prevents `load` from firing, so the data is never sent and the 5 s
  timer never starts; the user only sees the loading state. The timeout does
  not mitigate this. A dedicated origin would help.
- A widget can draw a fake form. The frame border and the "generated tool"
  badge are rendered by the parent, but the `title` (up to 200 chars) and the
  `inputs_summary` (up to 500 chars) are model-supplied text. Never treat
  in-frame content as trusted UI and never collect credentials in a widget.

### For domain MFE authors

Nothing to register. Keep using `registerToolRenderer` for structured results
and do not render model-supplied HTML yourself; if a result needs interactivity,
let the model use `renderWidget`.

---

## 5. Package Exports

`packages/ai` exports the following for domain MFEs to use (authoritative
list: `packages/ai/src/index.ts`):

```ts
// @workspace/ai — core runtime & UI
export { OlorinProvider } from "./src/components/provider"
export { OlorinWorkspace } from "./src/components/olorin-workspace"
export { OlorinPanel } from "./src/components/olorin-panel"
export { useOlorinContext } from "./src/lib/context"
export { useOlorinConversations } from "./src/lib/conversations"
export { registerOlorinContext, registerToolRenderer, collectOlorinContext } from "./src/lib/registry"
export type { ToolResultViewProps, ToolRendererEntry } from "./src/lib/registry"
export type { OlorinConversation, OlorinConversationMessage } from "./src/lib/conversations"

// default tool renderers (each card has a matching register*Renderer helper)
export {
  CustomerSummaryCard, EmployeeCard, FinanceAccountCard, InvoiceListCard,
  KnowledgeCitationList, KnowledgeSearchFeedback, GenericToolView,
  RunStatusBanner, RunErrorCard, ApprovalCard, DataTableView,
}

// sandboxed interactive widgets (section 4b); OlorinPanel already mounts the tool UI
export { WidgetFrame, WidgetSlot, RenderWidgetToolUI }

// settings & error handling
export {
  AISettingsDialog, resolveAiError, fetchAISettings, saveAISettings,
  testAIConnection, parseToolResult, messageText,
}
```

The exact export set grows with each renderer/settings addition; treat
`packages/ai/src/index.ts` as the source of truth when this snippet drifts.

### Chat surface behavior (2026-09-15)

- Assistant turns render a ChatGPT-style **activity disclosure**
  (`components/activity.tsx`): while the agent works, a shimmering status row
  names the running operation (`search` / `execute` / `readResult`) with an
  elapsed hint; when the turn settles it auto-collapses to
  `Đã xử lý trong Xs` and can be reopened for the details (reasoning, tool
  cards, executed sandbox steps).
- Streaming answers end with a blinking caret via
  `MarkdownMessage streaming` and the `ai-streaming-caret` utility in
  `packages/ui`; pending tool calls render as compact rows with a spinner
  instead of bordered skeletons.
- The assistant response is plain prose (no card wrapper); tool results,
  approvals and data tables keep their own cards inside the activity rail.

Domain MFEs import from `@workspace/ai` (resolved via Bun workspace symlinks).
They do **not** directly import from `@assistant-ui/react` or the AG-UI
client packages — the runtime wiring lives in `packages/ai/src/components/provider.tsx`.

---

## 6. Domain MFE Checklist

Before an MFE ships AI integration:

- [ ] Context contributor registered on relevant pages, unregistered on unmount
- [ ] Context keys follow the standard naming convention
- [ ] Context payload < 2 KiB
- [ ] Custom tool renderers registered at app initialization (not per-component)
- [ ] Renderer `match()` function is tight (no false positives on other domains)
- [ ] No direct calls to backend AI endpoints from domain MFE code
- [ ] `userDisplayName` contributed to context if available from auth state
