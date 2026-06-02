import { describe, it, expect } from 'vitest'
import { isConfigured, SUPABASE_URL } from '@/lib/supabase/config'

describe('supabase config', () => {
  it('eksportuje boolean isConfigured', () => {
    expect(typeof isConfigured).toBe('boolean')
  })
  it('isConfigured spójne z URL', () => {
    expect(isConfigured).toBe(SUPABASE_URL !== 'https://placeholder.supabase.co')
  })
})
