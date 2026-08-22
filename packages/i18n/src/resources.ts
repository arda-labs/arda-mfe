import { namespacesForApp, resourcesForApp } from "./app-resources"

// Backward-compatible full resource export for tooling and local inspection.
// Production app builds select a smaller app-specific resource set in config.ts.
export const resources = resourcesForApp("all")
export const namespaces = namespacesForApp("all")
