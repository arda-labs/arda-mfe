export type SearchParamValue = string | number | boolean | null | undefined

export type SearchParams = Record<
  string,
  SearchParamValue | readonly SearchParamValue[]
>

/** Build optional query parameters with one consistent omission rule. */
export function buildSearchParams(params: SearchParams = {}) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) {
      if (item === undefined || item === null || item === "") continue
      search.append(key, String(item))
    }
  }

  return search
}
