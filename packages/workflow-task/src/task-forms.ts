import type {
  TaskFormComponent,
  TaskFormModule,
  TaskFormRegistry,
} from "./types"

/**
 * Resolve the form registered for a server-provided `formKey`
 * (`<caseType>.<stepCode>`, e.g. `dpm_additional_v1.checker_review`).
 *
 * No fallback: an unregistered key returns undefined and the host must render
 * its "unsupported" state instead of guessing an action set.
 */
export function resolveTaskForm(
  registry: TaskFormRegistry | undefined,
  formKey?: string | null
): TaskFormComponent | undefined {
  if (!registry || !formKey) return undefined
  const trimmed = formKey.trim()
  if (!trimmed) return undefined
  return registry[trimmed] ?? registry[trimmed.toLowerCase()]
}

/** Normalize a remote `./taskForms` module into its registry. */
export function registryFromModule(
  module: TaskFormModule | undefined
): TaskFormRegistry {
  return module?.taskForms ?? module?.default ?? {}
}
