export interface DossierField {
  label: string
  value: string
}

export interface DossierDoc {
  title: string
  subtitle?: string
  fields: DossierField[]
  signatures?: string[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Opens a print-preview window for a customer dossier and triggers the browser
 * print dialog. Returns false when the popup was blocked.
 */
export function printDossier(doc: DossierDoc): boolean {
  const win = window.open("", "_blank", "width=860,height=720")
  if (!win) return false

  const fields = doc.fields
    .map(
      (f) =>
        `<div class="field"><span class="label">${escapeHtml(f.label)}</span><span class="value">${escapeHtml(f.value)}</span></div>`
    )
    .join("")

  const signatures = doc.signatures?.length
    ? `<div class="signatures">${doc.signatures
        .map(
          (s) =>
            `<div class="sign"><div class="line"></div><span>${escapeHtml(s)}</span></div>`
        )
        .join("")}</div>`
    : ""

  win.document.write(`<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  body { font-family: "Segoe UI", Arial, sans-serif; color: #111; margin: 24px; font-size: 13px; }
  h1 { font-size: 18px; margin: 0 0 2px; text-align: center; text-transform: uppercase; }
  .subtitle { text-align: center; color: #555; margin-bottom: 16px; font-size: 12px; }
  .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
  .field { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px dotted #ccc; padding: 3px 0; }
  .label { color: #555; }
  .value { font-weight: 600; text-align: right; }
  .signatures { display: flex; justify-content: space-around; margin-top: 48px; text-align: center; }
  .sign { width: 30%; }
  .sign .line { border-top: 1px solid #333; height: 40px; }
  .sign span { font-size: 12px; color: #333; }
  @media print { body { margin: 8mm; } }
</style>
</head>
<body>
  <h1>${escapeHtml(doc.title)}</h1>
  ${doc.subtitle ? `<div class="subtitle">${escapeHtml(doc.subtitle)}</div>` : ""}
  <div class="fields">${fields}</div>
  ${signatures}
</body>
</html>`)
  win.document.close()
  win.focus()
  window.setTimeout(() => win.print(), 250)
  return true
}
