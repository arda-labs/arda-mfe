import type { ComboboxOption } from "@workspace/ui/components/combobox"

type TreeItem = {
  id: string
  parent_id?: string | null
  code?: string
  name: string
}

/**
 * Orders flat parent/child rows depth-first (siblings by code) and sets the
 * indent depth, so a Combobox shows org units or account trees as a tree.
 * Rows whose parent is missing become roots; cycles are cut.
 */
export function toTreeOptions(items: TreeItem[]): ComboboxOption[] {
  const ids = new Set(items.map((item) => item.id))
  const children = new Map<string, TreeItem[]>()
  const roots: TreeItem[] = []
  for (const item of items) {
    const parent = item.parent_id && ids.has(item.parent_id) ? item.parent_id : null
    if (parent) children.set(parent, [...(children.get(parent) ?? []), item])
    else roots.push(item)
  }
  const byCode = (a: TreeItem, b: TreeItem) =>
    (a.code ?? a.name).localeCompare(b.code ?? b.name, "vi")

  const out: ComboboxOption[] = []
  const seen = new Set<string>()
  const visit = (item: TreeItem, depth: number) => {
    if (seen.has(item.id)) return
    seen.add(item.id)
    out.push({ value: item.id, code: item.code, label: item.name, depth })
    for (const child of [...(children.get(item.id) ?? [])].sort(byCode)) {
      visit(child, depth + 1)
    }
  }
  for (const root of [...roots].sort(byCode)) visit(root, 0)
  // Rows only reachable through a cycle never met a root; list them flat.
  for (const item of items) if (!seen.has(item.id)) visit(item, 0)
  return out
}
