/** Imperative navigation compatible with shell App. */
export function navigateTo(path: string) {
  window.dispatchEvent(new CustomEvent("arda:navigation-intent", { detail: path }))
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
