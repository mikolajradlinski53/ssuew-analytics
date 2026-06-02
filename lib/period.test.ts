import { describe, it, expect } from 'vitest'
import { nextOkres } from '@/lib/period'

describe('nextOkres', () => {
  it('przesuwa rok akademicki o 1', () => {
    expect(nextOkres('2025/2026')).toBe('2026/2027')
    expect(nextOkres('2024/2025')).toBe('2025/2026')
  })
  it('nierozpoznany format → bez zmian', () => {
    expect(nextOkres('cokolwiek')).toBe('cokolwiek')
  })
})
