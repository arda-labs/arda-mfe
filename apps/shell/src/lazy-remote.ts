import { lazy, type ComponentType } from "react"

type RemoteModule = {
  default?: ComponentType
  [key: string]: unknown
}

export function lazyRemote(load: () => Promise<RemoteModule>) {
  return lazy(async () => {
    const mod = await load()
    const component =
      mod.default ??
      Object.values(mod).find((value) => typeof value === "function")
    if (!component)
      throw new Error("Remote module did not expose a React component")
    return { default: component as ComponentType }
  })
}
