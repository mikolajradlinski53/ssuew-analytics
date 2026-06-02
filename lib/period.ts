// Przesuwa etykietę roku akademickiego o jeden ("2025/2026" → "2026/2027").
export function nextOkres(label: string): string {
  const m = label.match(/^(\d{4})\/(\d{4})$/)
  if (!m) return label
  return `${Number(m[1]) + 1}/${Number(m[2]) + 1}`
}
