// Builds the HTML document that hosts a model-generated widget inside a
// sandboxed iframe. Everything the parent knows about the host lives here, so
// switching from srcdoc to a dedicated origin later only changes the frame.
//
// Known limits. This module does not solve these alone:
// (a) Navigation of the frame (location.href, meta refresh, <a href>) is
//     governed by the EMBEDDING page's frame-src / sandbox policy, not by
//     WIDGET_CSP. The shell must set that policy.
// (b) WebRTC (RTCPeerConnection, TURN usernames) is not covered by connect-src.
// (c) The parent must accept only arda:height and arda:error, only from the
//     contentWindow of its own iframe (event.source), and must render
//     arda:error text as plain text: that text comes from model code.
// (d) Handshake: model listeners register while the document is parsed, before
//     the iframe `load` event. The parent must send arda:data after `load`.
import type { ChartTheme } from "./chart-theme"

export type WidgetSource = { html: string; css?: string; js: string }

// Blocks subresource and network loads from the document (scripts, styles,
// images, fonts, fetch/XHR/WebSocket, nested frames, form posts). It does NOT
// by itself stop navigation or WebRTC; see Known limits above.
// 'unsafe-inline' is required because both the runtime and the model code are
// inline; the iframe has an opaque origin, so inline is the only way to run anything.
export const WIDGET_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'"

// Inside <script> and <style> the tokenizer ends the element only at a closing
// tag. "<!--" followed by "<script" puts the tokenizer into the double-escaped
// state, where the real closing tag can be swallowed. "<\!--" is the same text
// inside JS and CSS string literals and keeps the tokenizer out of that state.
export function escapeInlineScript(source: string): string {
  return source.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--")
}

export function escapeInlineStyle(source: string): string {
  return source.replace(/<\/(style)/gi, "<\\/$1").replace(/<!--/g, "<\\!--")
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

// Fixed runtime. It posts exactly two message types: arda:height (a number)
// and arda:error (text, capped at 500 chars). That text can originate from
// model code, so it is untrusted. The runtime offers no API for sending other
// message types. Model code can still call postMessage directly, so the parent
// must validate (Known limits c).
const RUNTIME = `(function () {
  var parent = window.parent;
  function post(msg) { try { parent.postMessage(msg, "*"); } catch (e) {} }
  function reportHeight() {
    var body = document.body;
    if (!body) return;
    var h = Math.ceil(document.body.getBoundingClientRect().height);
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
  window.addEventListener("load", reportHeight);
  // This script is parsed in <head>, before document.body exists, so observation
  // starts only once the body is there.
  function start() {
    if (!document.body || typeof ResizeObserver !== "function") return;
    new ResizeObserver(reportHeight).observe(document.body);
  }
  if (document.readyState !== "loading") start();
  else document.addEventListener("DOMContentLoaded", start);
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
<style>${escapeInlineStyle(themeBlock(input.theme))}</style>
<script>${RUNTIME}</script>
</head>
<body>
${input.html}
<style>${css}</style>
<script>(function () { try {
${js}
} catch (e) { window.dispatchEvent(new ErrorEvent("error", { message: String(e && e.message || e) })); } })();</script>
</body>
</html>`
}
