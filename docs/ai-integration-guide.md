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
| `currentScreen` | `string` | Dot-namespaced screen identifier (e.g. `"crm.customer.detail"`) |
| `activeCustomerId` | `string` | CRM customer UUID |
| `activeEmployeeId` | `string` | HRM employee UUID |
| `activeInvoiceId` | `string` | Finance invoice UUID |
| `activeCaseId` | `string` | Workflow case UUID |
| `userDisplayName` | `string` | Used by Olorin panel for avatar initials |
| `userLocale` | `string` | `"vi"` or `"en"` — affects AI response language hint |

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
wins. Default renderers (`CustomerSummaryCard`, `KnowledgeCitationList`) are
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
import { registerInvoiceListRenderer } from "@workspace/ai/crm-renderers"

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

## 5. Package Exports

`packages/ai` exports the following for domain MFEs to use:

```ts
// @workspace/ai
export { OlorinProvider, OlorinPanel, OlorinWorkspace } from "./src/components/provider"
export { registerOlorinContext, registerToolRenderer, collectOlorinContext } from "./src/lib/registry"
export type { ToolResultViewProps, ToolRendererEntry } from "./src/lib/registry"
export type { OlorinConversation, OlorinConversationMessage } from "./src/lib/conversations"
```

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
