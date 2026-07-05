export type CustomerRoute = "registrations" | "profiles" | "risk" | "adjustments"

export function routeFromPath(pathname: string): CustomerRoute {
  if (pathname.startsWith("/customers/profiles")) return "profiles"
  if (pathname.startsWith("/customers/risk-cases")) return "risk"
  if (pathname.startsWith("/customers/adjustments")) return "adjustments"
  return "registrations"
}

export function customerIdFromSearch() {
  return new URLSearchParams(window.location.search).get("customerId")
}
