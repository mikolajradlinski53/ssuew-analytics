import { redirect } from 'next/navigation'
import { ktoNaStronie } from '@/lib/auth/naStronie'
import { gasList } from '@/lib/gas/client'
import { computeOverview } from '@/lib/overview'
import { buildAlerts } from '@/lib/stats'
import { serieZWierszy, ilorazSerii } from '@/lib/kpi/serie'
import { DeckHub, type DaneAnalityki, type DanePlanera } from '@/components/deck/DeckHub'
import { propozycjeRef } from '@/lib/firebase/admin'
import { biezacySemestr } from '@/lib/planer/semestry'
import { stanSesji } from '@/lib/planer/obraz'
import { SESJA_WYLACZONA } from '@/lib/planer/stan'
import type { Rola } from '@/lib/auth/role'

/**
 * Liczby z arkusza. Awaria arkusza nie może zabrać kokpitu — kafelek pokaże
 * zera, a pozostałe moduły dalej działają. Obietnica nigdy nie odrzuca.
 */
async function daneAnalityki(): Promise<DaneAnalityki> {
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

  return {
    konwersja,
    retencja: m.histRetention ?? 0,
    kpiWzrosty: serie.filter((s) => ilorazSerii(s) > 1).length,
    kpiRazem: serie.length,
    alerty: buildAlerts(rekrutacje, kohorty, serie).length,
  }
}

/**
 * Stan z Firestore. Odznakę propozycji widzi wyłącznie właściciel — dla
 * zarządu ta liczba nic nie znaczy. Awaria Firestore to zero i brak baneru,
 * nie wyjątek. Oba odczyty równolegle.
 */
async function danePlanera(rola: Rola, semestrId: string): Promise<DanePlanera> {
  const [propozycje, sesja] = await Promise.all([
    rola === 'owner'
      ? propozycjeRef(semestrId).count().get().then((s) => s.data().count).catch(() => 0)
      : Promise.resolve(0),
    stanSesji(semestrId).catch(() => SESJA_WYLACZONA),
  ])
  return { propozycje, sesja }
}

export default async function KokpitPage() {
  // Obie drogi wejścia. Sprawdzanie samego hasła odsyłało osoby na kodzie
  // na /login, a stamtąd useAuth odsyłał je z powrotem — pętla.
  const kto = await ktoNaStronie()
  if (!kto) redirect('/login')

  const semestr = biezacySemestr(new Date())

  // Celowo bez `await`: strona idzie do przeglądarki od razu, a liczby
  // dopływają strumieniem. Czekanie na arkusz (1–3 s przy pustym cache)
  // i Firestore po kolei dawało kilka sekund pustego ekranu.
  return (
    <DeckHub
      rola={kto.rola}
      email={kto.email}
      analityka={daneAnalityki()}
      planer={danePlanera(kto.rola, semestr.id)}
    />
  )
}
