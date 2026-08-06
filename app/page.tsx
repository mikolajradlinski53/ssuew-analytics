import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { zweryfikujToken } from '@/lib/auth/verify'
import { rolaDla } from '@/lib/auth/role'
import { gasList } from '@/lib/gas/client'
import { computeOverview } from '@/lib/overview'
import { buildAlerts } from '@/lib/stats'
import { DeckHub } from '@/components/deck/DeckHub'

export default async function KokpitPage() {
  const token = (await cookies()).get('deck_session')?.value ?? ''
  const tozsamosc = await zweryfikujToken(token)
  const rola = rolaDla(tozsamosc?.email)
  if (!tozsamosc || !rola) redirect('/login')

  // Awaria arkusza nie może zabrać całego kokpitu — kafelek pokaże zera,
  // a pozostałe moduły dalej działają.
  const [rekrutacje, kohorty, kpi] = await Promise.all([
    gasList('rekrutacje').catch(() => []),
    gasList('kohorty').catch(() => []),
    gasList('kpi').catch(() => []),
  ])

  // Trzeci argument to KpiPeriod[], którego aplikacja nie pobiera — tak samo
  // wywołuje to OverviewClient.
  const m = computeOverview(rekrutacje, kohorty, [])
  const konwersja =
    m.lastApplications && m.lastApplications > 0 && m.lastAccepted != null
      ? (m.lastAccepted / m.lastApplications) * 100
      : 0

  return (
    <DeckHub
      rola={rola}
      email={tozsamosc.email}
      dane={{
        konwersja,
        retencja: m.histRetention ?? 0,
        kpiWzrosty: kpi.filter((x) => x.wartosc_biezaca > x.wartosc_poprzednia).length,
        kpiRazem: kpi.length,
        alerty: buildAlerts(rekrutacje, kohorty, kpi).length,
      }}
    />
  )
}
