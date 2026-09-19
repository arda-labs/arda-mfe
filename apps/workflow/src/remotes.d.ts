// Domain remotes that expose `./taskForms` for the workbench form host (P1.6).
// The default export is the registry keyed by server `formKey`; `locales` lets
// the host register the owner's locale bundle before rendering its form.
declare module "deposit/taskForms" {
  import type { TaskFormRegistry } from "@workspace/workflow-task"

  const registry: TaskFormRegistry
  export const taskForms: TaskFormRegistry
  export const locales: { preload: (locale?: string) => Promise<void> }
  export default registry
}

declare module "capital/taskForms" {
  import type { TaskFormRegistry } from "@workspace/workflow-task"

  const registry: TaskFormRegistry
  export const taskForms: TaskFormRegistry
  export const locales: { preload: (locale?: string) => Promise<void> }
  export default registry
}
