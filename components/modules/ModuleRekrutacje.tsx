'use client'
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Rekrutacja } from '@/types'
import type { analyzeRekrutacje } from '@/lib/stats'

type Props = {
  stats: ReturnType<typeof analyzeRekrutacje>
  raw: Rekrutacja[]
}

function StatCard({ label, value, sub, color = 'text-gray-900' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-medium ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function InsightBox({ text, variant = 'info' }: { text: string; variant?: 'info' | 'warn' | 'ok' | 'danger' }) {
  const cls = {
    info:   'border-indigo-500 bg-indigo-50 text-indigo-800',
    ok:     'border-emerald-500 bg-emerald-50 text-emerald-800',
    warn:   'border-amber-500  bg-amber-50  text-amber-800',
    danger: 'border-red-500    bg-red-50    text-red-800',
  }[variant]
  return (
    <div className={`border-l-[3px] rounded-r-lg p-3 text-sm leading-relaxed mt-3 ${cls}`}>
      {text}
    </div>
  )
}

function ExplainBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed mt-3">
      {children}
    </div>
  )
}

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export default function ModuleRekrutacje({ stats, raw }: Props) {
  const { sorted, zglos, przyj, cr, corZglosAccepted, sezonowosc, forecast } = stats

  const barData = sorted.map((r, i) => ({
    edycja: r.edycja,
    zgłoszenia: zglos[i],
    przyjęci: przyj[i],
    'CR%': cr[i],
  }))

  const scatterData = sorted.map((_, i) => ({ x: zglos[i], y: przyj[i], label: sorted[i].edycja }))

  const lastEdycja = sorted[sorted.length - 1]?.edycja ?? "?"
  const nextLabels = [`J'26`, `W'27`]

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatCard label={`Przyjęci — ${lastEdycja}`} value={przyj[przyj.length - 1]} sub={`ze ${zglos[zglos.length - 1]} zgłoszeń`} />
        <StatCard label="Avg conversion rate" value={`${(cr.reduce((a,b)=>a+b,0)/cr.length).toFixed(1)}%`} sub="wszystkie edycje" />
        <StatCard label="Prognoza J'26" value={`~${forecast[0]} os.`} sub="regresja liniowa" color="text-indigo-700" />
        <StatCard label="Korelacja r (zgł.→przyj.)" value={corZglosAccepted.r.toFixed(3)} sub={`R²=${(corZglosAccepted.r2*100).toFixed(1)}%`} color={corZglosAccepted.significant ? 'text-emerald-700' : 'text-gray-700'} />
      </div>

      <SectionCard title="Zgłoszenia i przyjęci — trend historyczny" sub="Rekrutacje jesienne i wiosenne, 2022–2025">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="edycja" tick={{ fontSize: 11, fill: '#888' }} />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="zgłoszenia" fill="#B5D4F4" radius={[3,3,0,0]} />
            <Bar dataKey="przyjęci"   fill="#1D9E75" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Conversion rate per edycja" sub="% przyjętych ze zgłoszeń">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={barData} margin={{ top: 4, right: 8, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="edycja" tick={{ fontSize: 10, fill: '#888' }} />
              <YAxis tickFormatter={v => v + '%'} tick={{ fontSize: 10, fill: '#888' }} domain={[0, 110]} />
              <Tooltip formatter={(v) => String(v) + '%'} contentStyle={{ fontSize: 12 }} />
              <ReferenceLine y={60} stroke="#e5e7eb" strokeDasharray="4 2" label={{ value: 'avg', fontSize: 10, fill: '#aaa' }} />
              <Line type="monotone" dataKey="CR%" stroke="#534AB7" strokeWidth={2} dot={{ r: 4, fill: '#534AB7' }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard
          title="Korelacja: zgłoszenia ↔ przyjęci"
          sub={`r = ${corZglosAccepted.r.toFixed(3)} · R² = ${(corZglosAccepted.r2*100).toFixed(1)}% · p ${corZglosAccepted.p_approx}`}
        >
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 4, right: 8, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="x" name="Zgłoszenia" tick={{ fontSize: 10, fill: '#888' }} label={{ value: 'zgłoszenia', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#aaa' }} />
              <YAxis dataKey="y" name="Przyjęci"   tick={{ fontSize: 10, fill: '#888' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                if (!payload?.length) return null
                const d = payload[0].payload
                return <div className="bg-white border border-gray-200 rounded p-2 text-xs shadow">{d.label}<br />Zgłoszenia: {d.x} · Przyjęci: {d.y}</div>
              }} />
              <Scatter data={scatterData} fill="#534AB7" />
            </ScatterChart>
          </ResponsiveContainer>
          <InsightBox text={corZglosAccepted.interpretation} variant={corZglosAccepted.significant ? 'ok' : 'warn'} />
          <ExplainBox>
            <strong className="text-gray-700">r Pearsona</strong> — miara liniowego związku między zmiennymi (−1 do +1).{' '}
            <strong className="text-gray-700">R²</strong> = procent zmienności wyjaśnionej.{' '}
            <strong className="text-gray-700">p-value</strong> &lt;0.05 = wynik nieprzypadkowy.
          </ExplainBox>
        </SectionCard>
      </div>

      <SectionCard
        title="Test t Welcha: sezonowość jesień vs wiosna"
        sub={`t = ${sezonowosc.tStat.toFixed(2)} · df ≈ ${sezonowosc.df} · p ${sezonowosc.p_approx}`}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex gap-4 mb-3">
              <div className="flex-1 bg-indigo-50 rounded-lg p-3 text-center">
                <div className="text-xs text-indigo-600 mb-1">Jesień — avg</div>
                <div className="text-xl font-medium text-indigo-800">{sezonowosc.meanA.toFixed(1)}</div>
                <div className="text-xs text-indigo-500">SD={sezonowosc.sdA.toFixed(1)}</div>
              </div>
              <div className="flex-1 bg-emerald-50 rounded-lg p-3 text-center">
                <div className="text-xs text-emerald-600 mb-1">Wiosna — avg</div>
                <div className="text-xl font-medium text-emerald-800">{sezonowosc.meanB.toFixed(1)}</div>
                <div className="text-xs text-emerald-500">SD={sezonowosc.sdB.toFixed(1)}</div>
              </div>
            </div>
            <InsightBox text={sezonowosc.interpretation} variant={sezonowosc.significant ? 'ok' : 'warn'} />
            <ExplainBox>
              <strong className="text-gray-700">Test t Welcha</strong> sprawdza, czy dwie grupy różnią się bardziej niż oczekiwana losowa zmienność.
              Welch (nie klasyczny t) — bo wariancja edycji jesiennych jest wyraźnie wyższa niż wiosennych.
              Im dalej <em>t</em> od zera, tym silniejsza różnica. p&lt;0.05 = różnica realna.
            </ExplainBox>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-2">Prognoza liniowa — kolejne 2 edycje</div>
            {nextLabels.map((lab, i) => (
              <div key={lab} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600 w-12">{lab}</span>
                <div className="flex-1 bg-gray-100 rounded h-2">
                  <div className="bg-indigo-500 h-2 rounded" style={{ width: `${Math.min(100, (forecast[i] / 35) * 100)}%` }} />
                </div>
                <span className="text-sm font-medium text-indigo-700">~{forecast[i]} os.</span>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-2">Model: regresja liniowa na {sorted.length} edycjach. Prognoza orientacyjna.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
