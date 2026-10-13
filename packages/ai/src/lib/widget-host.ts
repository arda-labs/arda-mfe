// Builds the HTML document that hosts a model-generated widget inside a
// sandboxed iframe. Everything the parent knows about the host lives here, so
// switching from srcdoc to a dedicated origin later only changes the frame.
import type { ChartTheme } from "./chart-theme"

export type WidgetSource = { html: string; css?: string; js: string }

// Blocks every network and external resource. 'unsafe-inline' is required
// because both the runtime and the model code are inline; the iframe has an
// opaque origin, so inline is the only way to run anything.
export const WIDGET_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'"

export function escapeInlineScript(source: string): string {
  return source.replace(/<\/(script)/gi, "<\\/$1")
}

export function escapeInlineStyle(source: string): string {
  return source.replace(/<\/(style)/gi, "<\\/$1")
}

function themeBlock(theme: ChartTheme): string {
  const vars = [
    `--background: ${theme.background};`,
    `--foreground: ${theme.foreground};`,
    `--card: ${theme.card};`,
    `--border: ${theme.border};`,
    `--primary: ${theme.primary};`,
    `--primary-foreground: ${theme.primaryForeground};`,
    `--muted-foreground: ${theme.mutedForeground};`,
    ...theme.palette.map((color, index) => `--chart-${index + 1}: ${color};`),
    `--radius: 0.5rem;`,
  ]
  return `:root { ${vars.join(" ")} }
html, body { margin: 0; background: var(--background); color: var(--foreground); font: 13px/1.5 system-ui, sans-serif; }
body { padding: 12px; }
input, select, button { font: inherit; color: inherit; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 4px 8px; }
input[type=range] { padding: 0; border: 0; background: transparent; }
button { background: var(--primary); color: var(--primary-foreground); border-color: var(--primary); cursor: pointer; }
table { border-collapse: collapse; width: 100%; }
th, td { border-bottom: 1px solid var(--border); padding: 4px 6px; text-align: right; }
th:first-child, td:first-child { text-align: left; }`
}

// Fixed runtime. It only ever posts a number (height) or a bounded string
// (error) to the parent; there is no API for the model code to send text.
const RUNTIME = `(function () {
  var parent = window.parent;
  function post(msg) { try { parent.postMessage(msg, "*"); } catch (e) {} }
  function reportHeight() {
    var h = Math.ceil(document.documentElement.scrollHeight || document.body.scrollHeight || 0);
    post({ type: "arda:height", height: h });
  }
  window.addEventListener("message", function (event) {
    if (event.source !== parent) return;
    var msg = event.data;
    if (!msg || msg.type !== "arda:data") return;
    window.ARDA_DATA = msg.data;
    try { window.dispatchEvent(new CustomEvent("arda:data")); } catch (e) { post({ type: "arda:error", message: String(e && e.message || e).slice(0, 500) }); }
    reportHeight();
  });
  window.addEventListener("error", function (event) {
    post({ type: "arda:error", message: String(event.message || "error").slice(0, 500) });
  });
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    post({ type: "arda:error", message: String(reason && reason.message || reason || "rejection").slice(0, 500) });
  });
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(reportHeight).observe(document.documentElement);
  }
  window.addEventListener("load", reportHeight);
})();`

export function buildWidgetDocument(input: WidgetSource & { theme: ChartTheme }): string {
  const css = escapeInlineStyle(input.css ?? "")
  const js = escapeInlineScript(input.js)
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${WIDGET_CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>${themeBlock(input.theme)}</style>
<script>${RUNTIME}</script>
</head>
<body>
${input.html}
<style>${css}</style>
<script>(function () { try {
${js}
} catch (e) { window.parent.postMessage({ type: "arda:error", message: String(e && e.message || e).slice(0, 500) }, "*"); } })();</script>
</body>
</html>`
}
