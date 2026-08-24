export const SHELL_PAGE_TITLE_EVENT = "arda:shell-page-title"
export const SHELL_PAGE_HEADER_SLOT_ID = "arda-shell-page-header-slot"

export type ShellPageTitleState = {
  id: string
  title: string
  collapsed: boolean
  hideTitle?: boolean
}

export type ShellPageTitleEventDetail =
  (ShellPageTitleState & { cleared?: false }) | { id: string; cleared: true }

export function emitShellPageTitle(state: ShellPageTitleState) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<ShellPageTitleEventDetail>(SHELL_PAGE_TITLE_EVENT, {
      detail: state,
    })
  )
}

export function clearShellPageTitle(id: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<ShellPageTitleEventDetail>(SHELL_PAGE_TITLE_EVENT, {
      detail: { id, cleared: true },
    })
  )
}
