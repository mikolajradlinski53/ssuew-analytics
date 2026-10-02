import { redirect } from 'next/navigation'
import { ktoNaStronie } from '@/lib/auth/naStronie'
import { gasList } from '@/lib/gas/client'
import { computeOverview } from '@/lib/overview'
import { buildAlerts } from '@/lib/stats'
import { serieZWierszy, ilorazSerii } from '@/lib/kpi/serie'
import { DeckHub } from '@/components/deck/DeckHub'
import { propozycjeRef } from '@/lib/firebase/admin'
import { biezacySemestr } from '@/lib/planer/semestry'
import { stanSesji } from '@/lib/planer/obraz'
import { SESJA_WYLACZONA } from '@/lib/planer/stan'

export default async function KokpitPage() {
  // Obie drogi wejścia. Sprawdzanie samego hasła odsyłało osoby na kodzie
  // na /login, a stamtąd useAuth odsyłał je z powrotem — pętla.
  const kto = await ktoNaStronie()
  if (!kto) redirect('/login')

  const semestr = biezacySemestr(new Date())

  // Awaria arkusza nie może zabrać całego kokpitu — kafelek pokaże zera,
  // a pozostałe moduły dalej działają.
  const [rekrutacje, kohorty, punkty] = await Promise.all([
    gasList('rekrutacje').catch(() => []),
    gasList('kohorty').catch(() => []),
    gasList('kpi_punkty').catch(() => []),
  ])
  const serie = serieZWierszy(punkty)

  // Trzeci argument to KpiPeriod[], którego aplikacja nie pobiera — tak samo
  // wywołuje to OverviewClient.
  const m = computeOverview(rekrutacje, kohorty, [])
  const konwersja =
    m.lastApplications && m.lastApplications > 0 && m.lastAccepted != null
      ? (m.lastAccepted / m.lastApplications) * 100
      : 0

  // Odznakę widzi wyłącznie właściciel — dla zarządu liczba nierozpatrzonych
  // propozycji nic nie znaczy, bo i tak ich nie rozpatrzy.
  // Awaria Firestore nie może zabrać kokpitu, stąd zero zamiast wyjątku.
  const propozycje =
    kto.rola === 'owner'
      ? await propozycjeRef(semestr.id)
          .count()
          .get()
          .then((s) => s.data().count)
          .catch(() => 0)
      : 0

  // Awaria Firestore nie może zabrać kokpitu — wtedy po prostu bez baneru.
  const sesja = await stanSesji(semestr.id).catch(() => SESJA_WYLACZONA)

  return (
    <DeckHub
      rola={kto.rola}
      email={kto.email}
      dane={{
        konwersja,
        retencja: m.histRetention ?? 0,
        kpiWzrosty: serie.filter((s) => ilorazSerii(s) > 1).length,
        kpiRazem: serie.length,
        alerty: buildAlerts(rekrutacje, kohorty, serie).length,
        propozycje,
        sesja,
      }}
    />
  )
}
