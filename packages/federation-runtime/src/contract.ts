/** Increment only for an incompatible Routes/preload/provider contract change. */
export const ROUTES_CONTRACT_VERSION = 1
export function getBuildId() {
  return (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_MFE_BUILD_ID ?? "local"
}
export const routesContract = { version: ROUTES_CONTRACT_VERSION, buildId: getBuildId() }
