'use client'
import { useState } from 'react'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { analyzeRekrutacje, analyzeRetention, analyzeKomisje, mean } from '@/lib/stats'
import ModuleRekrutacje from './ModuleRekrutacje'
import ModuleRetention  from './ModuleRetention'
import ModuleKomisje    from './ModuleKomisje'
import ModuleWpis       from './ModuleWpis'

const TABS = [
  { id: 'rekrutacje', label: 'Rekrutacje' },
  { id: 'retention',  label: 'Retention' },
  { id: 'komisje',    label: 'Komisje' },
  { id: 'wpis',       label: 'Wpisz dane' },
] as const

type Tab = typeof TABS[number]['id']

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('rekrutacje')
  const { rekrutacje, kohorty, komisje, kpiPeriods, loading, usingDemo, addRekrutacja, addKpi } = useAnalyticsData()

  const rekrStats = rekrutacje.length >= 2 ? analyzeRekrutacje(rekrutacje) : null
  const retStats  = analyzeRetention(kohorty)
  const komStats  = kpiPeriods.length >= 2 ? analyzeKomisje(kpiPeriods) : null

  const avgCR = rekrutacje.length
    ? mean(rekrutacje.map(r => (r.przyjeci / r.zgloszenia) * 100))
    : 0

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-700 text-indigo-50 text-xs font-medium px-2.5 py-1 rounded">
              SSUEW
            </span>
            <div>
              <h1 className="text-sm font-medium text-gray-900">Analytics Platform</h1>
              <p className="text-xs text-gray-500">Wiceprzewodniczący ds. Strategii i Działań Operacyjnych</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {usingDemo && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded">
                Tryb demo — skonfiguruj Supabase
              </span>
            )}
            <span className="text-xs text-gray-400">rok akademicki 2025/2026</span>
          </div>
        </div>
      </header>

      {/* KPI summary bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 grid grid-cols-4 gap-4">
          {[
            { label: 'Edycje rekrutacyjne', value: rekrutacje.length, sub: 'łącznie' },
            { label: 'Avg conversion rate', value: avgCR.toFixed(1) + '%', sub: 'wszystkie edycje' },
            { label: 'Avg retention (hist.)', value: kohorty.filter(k=>!k.in_progress).length ? mean(kohorty.filter(k=>!k.in_progress).map(k=>k.avg_retention_sem)).toFixed(2) + ' sem.' : '—', sub: 'ukończone kohorty' },
            { label: 'Komisje monitorowane', value: komisje.length, sub: 'sem. letni 25/26' },
          ].map(kpi => (
            <div key={kpi.label} className="text-center">
              <div className="text-lg font-medium text-gray-900">{loading ? '…' : kpi.value}</div>
              <div className="text-xs text-gray-500">{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-700 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Ładowanie danych…</div>
        ) : (
          <>
            {tab === 'rekrutacje' && rekrStats && <ModuleRekrutacje stats={rekrStats} raw={rekrutacje} />}
            {tab === 'retention'  && <ModuleRetention  kohorty={kohorty} result={retStats} />}
            {tab === 'komisje'    && komStats && <ModuleKomisje stats={komStats} komisje={komisje} periods={kpiPeriods} />}
            {tab === 'wpis'       && <ModuleWpis komisje={komisje} onAddRekrutacja={addRekrutacja} onAddKpi={addKpi} />}
          </>
        )}
      </main>
    </div>
  )
}
