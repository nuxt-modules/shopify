export const toSearchParams = (query: Record<string, string | null | (string | null)[]>) => new URLSearchParams(
  Object.entries(query).flatMap(([name, value]) => [value].flat().map(item => [name, item ?? ''])),
)
