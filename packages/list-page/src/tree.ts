/** Parent → children index of a flat list; orphans become roots. */
export function buildTree<T>(
  items: T[],
  getId: (item: T) => string,
  getParentId: (item: T) => string | null | undefined,
  compare?: (a: T, b: T) => number
) {
  const ids = new Set(items.map(getId))
  const children = new Map<string, T[]>()
  const roots: T[] = []
  for (const item of items) {
    const parent = getParentId(item)
    // A parent outside the list (filtered, deleted) must not hide the row.
    if (parent && parent !== getId(item) && ids.has(parent)) {
      children.set(parent, [...(children.get(parent) ?? []), item])
    } else {
      roots.push(item)
    }
  }
  if (compare) {
    roots.sort(compare)
    for (const list of children.values()) list.sort(compare)
  }
  return { roots, children }
}

/** Ids of rows above `depth` (0 = roots), i.e. expanded by default. */
export function expandedToDepth<T>(
  roots: T[],
  children: Map<string, T[]>,
  getId: (item: T) => string,
  depth: number
): Record<string, boolean> {
  const expanded: Record<string, boolean> = {}
  const walk = (nodes: T[], level: number, seen: Set<string>) => {
    if (level >= depth) return
    for (const node of nodes) {
      const id = getId(node)
      if (seen.has(id)) continue // cycle guard
      const kids = children.get(id)
      if (kids?.length) {
        expanded[id] = true
        walk(kids, level + 1, new Set(seen).add(id))
      }
    }
  }
  walk(roots, 0, new Set())
  return expanded
}
