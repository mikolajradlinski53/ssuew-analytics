export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toFixed(decimals)
}
