export function parsePositiveInteger(raw: string | null, fallback: number) {
  const parsed = Number.parseInt(raw ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
