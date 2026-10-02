import { act, render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ReactNode } from 'react'
import { DeckHub, type DaneAnalityki, type DanePlanera } from '@/components/deck/DeckHub'

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const wyloguj = vi.fn()
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
vi.mock('@/lib/auth/useAuth', () => ({ useAuth: () => ({ wyloguj }) }))

const ANALITYKA: DaneAnalityki = { konwersja: 61.1, retencja: 3.81, kpiWzrosty: 20, kpiRazem: 28, alerty: 2 }
const PLANER: DanePlanera = { propozycje: 0, sesja: { wlaczony: false, od: null, przez: null } }

/** Obietnica, która nigdy się nie spełnia — arkusz, który jeszcze nie odpowiedział. */
const nigdy = <T,>() => new Promise<T>(() => {})

async function hub(nadpisz: {
  rola?: 'owner' | 'board'
  email?: string
  analityka?: Partial<DaneAnalityki> | Promise<DaneAnalityki>
  planer?: Partial<DanePlanera> | Promise<DanePlanera>
} = {}) {
  const analityka = nadpisz.analityka instanceof Promise
    ? nadpisz.analityka
    : Promise.resolve({ ...ANALITYKA, ...nadpisz.analityka })
  const planer = nadpisz.planer instanceof Promise
    ? nadpisz.planer
    : Promise.resolve({ ...PLANER, ...nadpisz.planer })
  // Dane ze strumienia (use + Suspense) dopływają w mikrozadaniach — bez
  // asynchronicznego act React nie zdąży podmienić wersji zastępczej.
  return act(async () => {
    render(
    <DeckHub
      rola={nadpisz.rola ?? 'owner'}
      email={nadpisz.email ?? 'ja@e.com'}
      analityka={analityka}
      planer={planer}
    />,
    )
  })
}

describe('DeckHub', () => {
  it('nagłówek i kafelki są od razu — nie czekają na arkusz ani Firestore', async () => {
    // Przyczyna kilkusekundowego wejścia: strona czekała z wyświetleniem
    // czegokolwiek na trzy zakładki Apps Script (2–3 s każda przy pustym cache).
    await hub({ analityka: nigdy(), planer: nigdy() })
    expect(screen.getByText('DECK')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /SSUEW Analytics/ })).toHaveAttribute('href', '/analytics')
    expect(screen.getByRole('link', { name: /Planer semestru/ })).toHaveAttribute('href', '/planer')
    expect(screen.getByRole('button', { name: /wyloguj/i })).toBeInTheDocument()
  })

  it('pokazuje Orbitę właścicielowi', async () => {
    await hub()
    expect(screen.getByText('Orbita')).toBeInTheDocument()
  })

  it('ukrywa Orbitę przed zarządem — nie wyszarza, tylko nie renderuje', async () => {
    await hub({ rola: 'board', email: 'z@e.com' })
    expect(screen.queryByText('Orbita')).toBeNull()
  })

  it('pokazuje liczbę alertów na kafelku Analytics, gdy arkusz odpowie', async () => {
    await hub()
    expect(await screen.findByText('2 alerty')).toBeInTheDocument()
  })

  it('nie pokazuje odznaki alertów, gdy alertów nie ma', async () => {
    await hub({ analityka: { alerty: 0 } })
    await screen.findByText(/28 metryk w pamięci/)
    // Sama etykieta „alerty" zostaje w kafelku statystyk — znika tylko odznaka
    // z liczbą, więc szukamy wzorca „<liczba> alerty".
    expect(screen.queryByText(/\d+ alerty/)).toBeNull()
  })

  it('pokazuje adres i rolę zalogowanego', async () => {
    await hub({ rola: 'board', email: 'zarzad@e.com' })
    expect(screen.getByText('zarzad@e.com')).toBeInTheDocument()
    expect(screen.getByText('board')).toBeInTheDocument()
  })

  it('ma przycisk wylogowania', async () => {
    // Kokpit jest ekranem, na ktorym sie laduje po zalogowaniu. Bez tego
    // przycisku nie da sie z niego wyjsc — powloka z sidebarem obejmuje
    // wylacznie /analytics/*, wiec tam wylogowania po prostu nie widac.
    await hub()
    fireEvent.click(screen.getByRole('button', { name: /wyloguj/i }))
    expect(wyloguj).toHaveBeenCalled()
  })

  it('pokazuje odznakę z liczbą propozycji do decyzji', async () => {
    await hub({ planer: { propozycje: 3 } })
    expect(await screen.findByText('3 do decyzji')).toBeInTheDocument()
  })

  it('pokazuje baner trwającej Sesji Operacyjnej z odnośnikiem do Planera', async () => {
    await hub({
      rola: 'board',
      email: 'Jula',
      planer: { sesja: { wlaczony: true, od: Date.now() - 5 * 60_000, przez: 'ja' } },
    })
    expect(await screen.findByRole('link', { name: /Sesja Operacyjna trwa/ })).toHaveAttribute('href', '/planer')
  })

  it('baner sesji nie czeka na arkusz', async () => {
    await hub({ analityka: nigdy(), planer: { sesja: { wlaczony: true, od: null, przez: 'ja' } } })
    expect(await screen.findByText(/Sesja Operacyjna trwa/)).toBeInTheDocument()
  })

  it('bez sesji baneru nie ma', async () => {
    await hub()
    await screen.findByText(/28 metryk w pamięci/)
    expect(screen.queryByText(/Sesja Operacyjna trwa/)).toBeNull()
  })
})
