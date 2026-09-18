import * as React from "react"

/**
 * Portal target for renderer-specific controls (page nav, zoom, rotate, ...)
 * inside the single preview header. Renderers portal their controls here so
 * the dialog/drawer keeps exactly one top bar with both file actions and
 * content controls.
 */
const PreviewControlsContext = React.createContext<HTMLElement | null>(null)

export function usePreviewControlsTarget() {
  return React.useContext(PreviewControlsContext)
}

export function PreviewControlsProvider({
  target,
  children,
}: {
  target: HTMLElement | null
  children: React.ReactNode
}) {
  return (
    <PreviewControlsContext.Provider value={target}>
      {children}
    </PreviewControlsContext.Provider>
  )
}
