import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PasekStatusu, type DanePaska } from '@/components/deck/PasekStatusu'

const DANE: DanePaska = { czasArkuszaMs: 420, firestoreOk: true, metryki: 28, alerty: 0 }
const stan = (nazwa: string) => document.querySelector(`[data-segment="${nazwa}"]`)?.getAttribute('data-stan')

describe('PasekStatusu', () => {
  it('wszystko działa - zielone kropki, szybki arkusz w milisekundach', () => {
    render(<PasekStatusu kodem={false} godzina="14:32" dane={DANE} />)
    expect(screen.getByText('420 ms')).toBeInTheDocument()
    expect(stan('arkusz')).toBe('ok')
    expect(stan('firestore')).toBe('ok')
    expect(stan('metryki')).toBe('ok')
    expect(screen.getByText('hasło')).toBeInTheDocument()
    expect(screen.getByText('14:32')).toBeInTheDocument()
  })

  it('wolny arkusz i alerty - żółte; brak arkusza i Firestore - czerwone', () => {
    const { rerender } = render(<PasekStatusu kodem godzina="14:32" dane={{ ...DANE, czasArkuszaMs: 4200, alerty: 2 }} />)
    expect(stan('arkusz')).toBe('uwaga')
    expect(screen.getByText('4,2 s')).toBeInTheDocument()
    expect(stan('metryki')).toBe('uwaga')
    expect(screen.getByText('kod')).toBeInTheDocument()
    rerender(<PasekStatusu kodem godzina="14:32" dane={{ ...DANE, czasArkuszaMs: null, firestoreOk: false }} />)
    expect(stan('arkusz')).toBe('blad')
    expect(stan('firestore')).toBe('blad')
  })

  it('zanim dane dopłyną - „łączę…” i kropki w oczekiwaniu', () => {
    render(<PasekStatusu kodem={false} godzina="14:32" dane={null} />)
    expect(stan('arkusz')).toBe('czeka')
    expect(screen.getAllByText('łączę…')).toHaveLength(2)
  })
})
