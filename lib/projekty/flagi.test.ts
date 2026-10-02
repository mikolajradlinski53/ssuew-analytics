import { describe, it, expect } from 'vitest'
import { flagiProjektu, kondycjaEdycji, edycje, PROGI } from '@/lib/projekty/flagi'
import type { Projekt } from '@/types'

function p(nadpisz: Partial<Projekt> = {}): Projekt {
  return {
    id: 'x', projekt: 'Gala', edycja: '2025/2026', obszar: 'Kultura',
    budzet_plan: 5000, budzet_wydany: 4500, przedluzenia: 0,
    aplikujacy: 30, uczestnicy: 20, partnerzy_fin: 2, partnerzy_barter: 1,
    problemy: '', created_at: '', ...nadpisz,
  }
}
const ma = (f: ReturnType<typeof flagiProjektu>, id: string) => f.find((x) => x.id === id)

describe('flagiProjektu — budżet', () => {
  it('przekroczenie daje alarm z procentem i kwotami', () => {
    const f = ma(flagiProjektu(p({ budzet_plan: 5000, budzet_wydany: 7000 }), null), 'budzet-przekroczony')
    expect(f?.waga).toBe('alarm')
    expect(f?.detal).toContain('40%')
    expect(f?.detal).toContain('7')
    expect(f?.detal).toContain('5')
  })

  it('wydatek bez przyznanego budżetu też jest alarmem', () => {
    const f = flagiProjektu(p({ budzet_plan: 0, budzet_wydany: 800 }), null)
    expect(ma(f, 'budzet-bez-planu')?.waga).toBe('alarm')
  })

  it('ledwo ruszony budżet daje uwagę', () => {
    const f = ma(flagiProjektu(p({ budzet_plan: 5000, budzet_wydany: 2000 }), null), 'budzet-niewykorzystany')
    expect(f?.waga).toBe('uwaga')
    expect(f?.detal).toContain('40%')
  })

  it('dokładnie na progu milczy', () => {
    const f = flagiProjektu(p({ budzet_plan: 5000, budzet_wydany: 5000 * PROGI.budzetNiewykorzystany }), null)
    expect(ma(f, 'budzet-niewykorzystany')).toBeUndefined()
  })

  it('plan zero i wydane zero nie daje NaN ani Infinity', () => {
    const f = flagiProjektu(p({ budzet_plan: 0, budzet_wydany: 0 }), null)
    expect(JSON.stringify(f)).not.toMatch(/NaN|Infinity/)
  })
})

describe('flagiProjektu — nabór i partnerzy', () => {
  it('dwa przedłużenia dają uwagę, jedno nie', () => {
    expect(ma(flagiProjektu(p({ przedluzenia: 2 }), null), 'nabor-przedluzany')).toBeTruthy()
    expect(ma(flagiProjektu(p({ przedluzenia: 1 }), null), 'nabor-przedluzany')).toBeUndefined()
  })

  it('brak partnera finansowego daje uwagę i wymienia barterowych', () => {
    const f = ma(flagiProjektu(p({ partnerzy_fin: 0, partnerzy_barter: 3 }), null), 'bez-partnera-fin')
    expect(f?.detal).toContain('3')
  })

  it('nabór bez nadwyżki chętnych daje uwagę', () => {
    expect(ma(flagiProjektu(p({ aplikujacy: 20, uczestnicy: 20 }), null), 'nabor-ledwo-obsadzony')).toBeTruthy()
    expect(ma(flagiProjektu(p({ aplikujacy: 30, uczestnicy: 20 }), null), 'nabor-ledwo-obsadzony')).toBeUndefined()
  })

  it('niewypełnione liczby nie zapalają flagi obsadzenia', () => {
    expect(ma(flagiProjektu(p({ aplikujacy: 0, uczestnicy: 0 }), null), 'nabor-ledwo-obsadzony')).toBeUndefined()
  })

  it('opisane problemy dają flagę informacyjną z treścią', () => {
    const f = ma(flagiProjektu(p({ problemy: 'sala odwołana' }), null), 'problemy')
    expect(f?.waga).toBe('info')
    expect(f?.detal).toBe('sala odwołana')
  })

  it('same spacje w polu problemów to nie opis', () => {
    expect(ma(flagiProjektu(p({ problemy: '   ' }), null), 'problemy')).toBeUndefined()
  })
})

describe('flagiProjektu — porównanie z poprzednią edycją', () => {
  const stara = p({ edycja: '2024/2025', aplikujacy: 31, uczestnicy: 25 })

  it('spadek chętnych poniżej progu daje uwagę z obiema liczbami', () => {
    const f = ma(flagiProjektu(p({ aplikujacy: 12 }), stara), 'mniej-chetnych')
    expect(f?.detal).toContain('12')
    expect(f?.detal).toContain('31')
    expect(f?.detal).toContain('2024/2025')
  })

  it('drobny spadek nad progiem milczy', () => {
    expect(ma(flagiProjektu(p({ aplikujacy: 28 }), stara), 'mniej-chetnych')).toBeUndefined()
  })

  it('spadek uczestników daje osobną uwagę', () => {
    expect(ma(flagiProjektu(p({ uczestnicy: 10 }), stara), 'mniej-uczestnikow')).toBeTruthy()
  })

  it('pierwsza edycja nie daje żadnej flagi porównawczej', () => {
    const f = flagiProjektu(p({ aplikujacy: 1, uczestnicy: 1 }), null)
    expect(ma(f, 'mniej-chetnych')).toBeUndefined()
    expect(ma(f, 'mniej-uczestnikow')).toBeUndefined()
  })

  it('zerowa poprzednia wartość nie daje fałszywego spadku', () => {
    const f = flagiProjektu(p({ aplikujacy: 5 }), p({ edycja: '2024/2025', aplikujacy: 0 }))
    expect(ma(f, 'mniej-chetnych')).toBeUndefined()
  })

  it('niewpisana bieżąca liczba (zero z pustej komórki) nie udaje spadku', () => {
    const f = flagiProjektu(p({ aplikujacy: 0, uczestnicy: 0 }), stara)
    expect(ma(f, 'mniej-chetnych')).toBeUndefined()
    expect(ma(f, 'mniej-uczestnikow')).toBeUndefined()
  })
})

describe('kondycjaEdycji', () => {
  const dane = [
    p({ id: '1', projekt: 'Adapciak', edycja: '2025/2026' }),
    p({ id: '2', projekt: 'Gala', edycja: '2025/2026', budzet_wydany: 9000 }),
    p({ id: '3', projekt: 'TEDx', edycja: '2025/2026', partnerzy_fin: 0 }),
    p({ id: '4', projekt: 'Gala', edycja: '2024/2025', aplikujacy: 60 }),
  ]

  it('alarm idzie przed samymi uwagami, czysty projekt na koniec', () => {
    const k = kondycjaEdycji(dane, '2025/2026')
    expect(k.map((x) => x.projekt.projekt)).toEqual(['Gala', 'TEDx', 'Adapciak'])
  })

  it('podpina poprzednią edycję tam, gdzie istnieje', () => {
    const k = kondycjaEdycji(dane, '2025/2026')
    expect(k.find((x) => x.projekt.projekt === 'Gala')?.poprzednia?.edycja).toBe('2024/2025')
    expect(k.find((x) => x.projekt.projekt === 'TEDx')?.poprzednia).toBeNull()
  })

  it('bierze najbliższą wcześniejszą edycję, nie najstarszą', () => {
    const trzy = [
      p({ projekt: 'Bal', edycja: '2023/2024', aplikujacy: 90 }),
      p({ projekt: 'Bal', edycja: '2024/2025', aplikujacy: 50 }),
      p({ projekt: 'Bal', edycja: '2025/2026', aplikujacy: 45 }),
    ]
    const k = kondycjaEdycji(trzy, '2025/2026')
    expect(k[0].poprzednia?.edycja).toBe('2024/2025')
  })

  it('nieznana edycja daje pustą listę, nie wyjątek', () => {
    expect(kondycjaEdycji(dane, '2030/2031')).toEqual([])
  })
})

describe('edycje', () => {
  it('zwraca unikalne, od najnowszej', () => {
    const dane = [p({ edycja: '2024/2025' }), p({ edycja: '2025/2026' }), p({ edycja: '2024/2025' })]
    expect(edycje(dane)).toEqual(['2025/2026', '2024/2025'])
  })

  it('pusta lista nie wywala się', () => {
    expect(edycje([])).toEqual([])
  })
})
