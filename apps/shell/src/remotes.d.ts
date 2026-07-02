declare module "iam/Routes" {
  import type { ComponentType } from "react"

  const Routes: ComponentType
  export default Routes
}

declare module "platform/Routes" {
  import type { ComponentType } from "react"

  const Routes: ComponentType
  export default Routes
}

declare module "finance/Routes" {
  import type { ComponentType } from "react"

  const Routes: ComponentType
  export default Routes
}

declare module "account/Routes" {
  import type { ComponentType } from "react"

  const Routes: ComponentType
  export default Routes
}

declare module "zeebe-bpmn-moddle/resources/zeebe.json" {
  const descriptor: Record<string, unknown>
  export default descriptor
}
