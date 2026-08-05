import { describe, it, expect, vi, afterEach } from 'vitest'
import { rolaDla } from '@/lib/auth/role'

afterEach(() => vi.unstubAllEnvs())

describe('rolaDla', () => {
  it('rozpoznaje właściciela', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', '')
    expect(rolaDla('ja@example.com')).toBe('owner')
  })

  it('rozpoznaje zarząd z listy po przecinkach', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', 'a@example.com, b@example.com')
    expect(rolaDla('b@example.com')).toBe('board')
  })

  it('nie zważa na wielkość liter ani spacje', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', '')
    expect(rolaDla('  JA@Example.COM ')).toBe('owner')
  })

  it('odmawia adresowi spoza listy', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', 'ja@example.com')
    vi.stubEnv('DECK_BOARD_EMAILS', 'a@example.com')
    expect(rolaDla('ktos@obcy.pl')).toBeNull()
  })

  it('odmawia pustemu adresowi, nawet gdy lista jest pusta', () => {
    vi.stubEnv('DECK_OWNER_EMAIL', '')
    vi.stubEnv('DECK_BOARD_EMAILS', '')
    expect(rolaDla('')).toBeNull()
    expect(rolaDla(null)).toBeNull()
    expect(rolaDla(undefined)).toBeNull()
  })
})
