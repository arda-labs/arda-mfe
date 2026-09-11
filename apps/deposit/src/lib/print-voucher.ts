export interface VoucherField {
  label: string
  value: string
}

export interface VoucherTable {
  columns: string[]
  rows: string[][]
}

export interface VoucherDoc {
  title: string
  subtitle?: string
  fields: VoucherField[]
  table?: VoucherTable
  signatures?: string[]
  footer?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Opens a standalone print window for a transaction voucher and triggers the
 * browser print dialog. Returns false when the popup was blocked so callers
 * can surface a toast instead of failing silently.
 */
export function printVoucher(doc: VoucherDoc): boolean {
  const win = window.open("", "_blank", "width=900,height=720")
  if (!win) return false

  const fields = doc.fields
    .map(
      (f) =>
        `<div class="field"><span class="label">${escapeHtml(f.label)}</span><span class="value">${escapeHtml(f.value)}</span></div>`
    )
    .join("")

  const table = doc.table
    ? `<table><thead><tr>${doc.table.columns
        .map((c) => `<th>${escapeHtml(c)}</th>`)
        .join("")}</tr></thead><tbody>${doc.table.rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
        )
        .join("")}</tbody></table>`
    : ""

  const signatures = doc.signatures?.length
    ? `<div class="signatures">${doc.signatures
        .map((s) => `<div class="sign"><div class="line"></div><span>${escapeHtml(s)}</span></div>`)
        .join("")}</div>`
    : ""

  win.document.write(`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #111; margin: 24px; font-size: 13px; }
  h1 { font-size: 18px; margin: 0 0 2px; text-align: center; text-transform: uppercase; }
  .subtitle { text-align: center; color: #555; margin-bottom: 16px; font-size: 12px; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 16px; }
  .field { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px dotted #ccc; padding: 3px 0; }
  .label { color: #555; }
  .value { font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; }
  th { background: #f2f2f2; font-size: 12px; }
  td { font-size: 12px; }
  .signatures { display: flex; justify-content: space-around; margin-top: 48px; text-align: center; }
  .sign { width: 30%; }
  .sign .line { border-top: 1px solid #333; height: 40px; }
  .sign span { font-size: 12px; color: #333; }
  .footer { margin-top: 24px; text-align: center; color: #777; font-size: 11px; }
  @media print { body { margin: 8mm; } }
</style>
</head>
<body>
  <h1>${escapeHtml(doc.title)}</h1>
  ${doc.subtitle ? `<div class="subtitle">${escapeHtml(doc.subtitle)}</div>` : ""}
  <div class="fields">${fields}</div>
  ${table}
  ${signatures}
  ${doc.footer ? `<div class="footer">${escapeHtml(doc.footer)}</div>` : ""}
</body>
</html>`)
  win.document.close()
  win.focus()
  window.setTimeout(() => win.print(), 250)
  return true
}
