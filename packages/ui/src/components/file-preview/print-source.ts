/**
 * Prints a preview source through a hidden same-origin iframe. Blob URLs are
 * same-origin so `contentWindow.print()` works; cross-origin sources fall back
 * to opening a new tab where the browser print dialog is available.
 */
export function printPreviewSource(src: string) {
  if (!src) return
  const frame = document.createElement("iframe")
  frame.setAttribute("aria-hidden", "true")
  frame.style.position = "fixed"
  frame.style.width = "0"
  frame.style.height = "0"
  frame.style.border = "0"
  frame.style.visibility = "hidden"
  frame.src = src
  frame.onload = () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } catch {
      window.open(src, "_blank", "noopener,noreferrer")
    }
    window.setTimeout(() => frame.remove(), 60_000)
  }
  document.body.appendChild(frame)
}
