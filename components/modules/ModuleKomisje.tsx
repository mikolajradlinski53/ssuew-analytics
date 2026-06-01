'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Komisja, KpiPeriod } from '@/types'
import type { analyzeKomisje } from '@/lib/stats'
import { zInterpretation } from '@/lib/stats'

type Props = {
  stats: ReturnType<typeof analyzeKomisje>
  komisje: Komisja[]
  periods: KpiPeriod[]
}

function InsightBox({ text, variant='info' }: { text:string; variant?:'info'|'warn'|'ok'|'danger' }) {
  const cls={info:'border-indigo-500 bg-indigo-50 text-indigo-800',ok:'border-emerald-500 bg-emerald-50 text-emerald-800',warn:'border-amber-500 bg-amber-50 text-amber-800',danger:'border-red-500 bg-red-50 text-red-800'}[variant]
  return <div className={`border-l-[3px] rounded-r-lg p-3 text-sm leading-relaxed mt-3 ${cls}`}>{text}</div>
}
function ExplainBox({ children }:{children:React.ReactNode}) {
  return <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed mt-3">{children}</div>
}
function SectionCard({ title, sub, children }:{title:string;sub?:string;children:React.ReactNode}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
      <div className="mb-4"><h3 className="text-sm font-medium text-gray-900">{title}</h3>{sub&&<p className="text-xs text-gray-500 mt-0.5">{sub}</p>}</div>
      {children}
    </div>
  )
}

function zBadge(z: number) {
  if (z >  1.5) return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">powyżej normy</span>
  if (z > -0.5) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">w normie</span>
  if (z > -1.5) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">uważaj</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">poniżej normy</span>
}

export default function ModuleKomisje({ stats, komisje, periods }: Props) {
  const { realizacje, zs, mean: avgReal, sd: sdReal, corProjKpi, withZ } = stats

  const barData = withZ.map(p => ({
    kod: p.komisja?.kod ?? '?',
    'realizacja KPI%': p.realizacjaPct,
    z: p.z,
  }))

  const scatterData = withZ.map(p => ({
    x: p.projekty_planowane,
    y: p.realizacjaPct,
    label: p.komisja?.kod ?? '?',
  }))

  const ranked = [...withZ].sort((a,b)=>b.realizacjaPct-a.realizacjaPct)

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-4"><div className="text-xs text-gray-500 mb-1">Avg realizacja KPI</div><div className="text-xl font-medium text-gray-900">{avgReal}%</div><div className="text-xs text-gray-400 mt-1">norma organizacyjna</div></div>
        <div className="bg-gray-50 rounded-lg p-4"><div className="text-xs text-gray-500 mb-1">SD (rozrzut komisji)</div><div className="text-xl font-medium text-gray-900">{sdReal} pp</div><div className="text-xs text-gray-400 mt-1">im niższy, tym spójniej</div></div>
        <div className="bg-gray-50 rounded-lg p-4"><div className="text-xs text-gray-500 mb-1">Korelacja r (proj→KPI)</div><div className={`text-xl font-medium ${corProjKpi.significant?'text-emerald-700':'text-gray-700'}`}>{corProjKpi.r.toFixed(3)}</div><div className="text-xs text-gray-400 mt-1">p {corProjKpi.p_approx}</div></div>
        <div className="bg-gray-50 rounded-lg p-4"><div className="text-xs text-gray-500 mb-1">Komisji poniżej normy</div><div className="text-xl font-medium text-red-600">{zs.filter(z=>z<-1).length}</div><div className="text-xs text-gray-400 mt-1">z &lt; −1.0</div></div>
      </div>

      <SectionCard title="Z-score komisji — odchylenie od normy organizacyjnej" sub={`Avg=${avgReal}%, SD=${sdReal} pp · próg alarmowy: |z| > 1.5`}>
        <div className="space-y-3">
          {withZ.map((p, i) => {
            const z = p.z
            const fillColor = z > 1 ? '#1D9E75' : z < -1 ? '#E24B4A' : '#534AB7'
            const barW = Math.min(48, Math.abs(z) / 2.5 * 48)
            const isNeg = z < 0
            return (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500 w-24 shrink-0">{p.komisja?.kod ?? '?'}</span>
                <div className="flex-1 relative h-3 bg-gray-100 rounded">
                  <div className="absolute left-1/2 top-0 w-px h-3 bg-gray-300" />
                  <div
                    className="absolute top-0 h-3 rounded"
                    style={{
                      width: `${barW}%`,
                      left: isNeg ? `calc(50% - ${barW}%)` : '50%',
                      background: fillColor,
                    }}
                  />
                </div>
                <span className="w-12 text-right text-sm font-medium" style={{ color: fillColor }}>
                  {z > 0 ? '+' : ''}{z.toFixed(2)}
                </span>
                {zBadge(z)}
                <span className="text-sm text-gray-700 w-8 text-right">{p.realizacjaPct}%</span>
              </div>
            )
          })}
        </div>
        <ExplainBox>
          <strong className="text-gray-700">Z-score</strong> = (wartość komisji − średnia) / odchylenie standardowe.
          Z=0 to dokładna przeciętna. Z=+1 = o 1 SD lepiej. |z|&gt;1.5 = sygnał na zebranie Zarządu.
          |z|&gt;2.0 = interwencja lub nagroda — zależnie od znaku.
        </ExplainBox>

        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">Interpretacje per komisja</p>
          <div className="grid grid-cols-2 gap-2">
            {withZ.map(p => (
              <div key={p.id} className="text-xs text-gray-500 flex gap-2">
                <span className="font-medium text-gray-700 shrink-0">{p.komisja?.kod}</span>
                <span>{p.interpretation}</span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Realizacja KPI — wykres porównawczy" sub="% projektów zrealizowanych per komisja">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{top:4,right:8,left:-15,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="kod" tick={{fontSize:10,fill:'#888'}} />
              <YAxis tickFormatter={v=>v+'%'} tick={{fontSize:10,fill:'#888'}} domain={[0,100]} />
              <Tooltip formatter={(v)=>String(v)+'%'} contentStyle={{fontSize:12}} />
              <ReferenceLine y={avgReal} stroke="#e5e7eb" strokeDasharray="4 2" label={{value:'avg',fontSize:10,fill:'#aaa'}} />
              <Bar dataKey="realizacja KPI%" radius={[3,3,0,0]}
                fill="#534AB7"
                label={{position:'top',fontSize:10,fill:'#555',formatter:(v: unknown)=>String(v)+'%'}}
              />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard
          title={`Korelacja: projekty ↔ KPI (r=${corProjKpi.r.toFixed(3)})`}
          sub={`R²=${(corProjKpi.r2*100).toFixed(1)}% · p ${corProjKpi.p_approx}${corProjKpi.significant?' · istotne':' · n.s.'}`}
        >
          <div className="space-y-2 mt-2">
            {scatterData.map(d => (
              <div key={d.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16 shrink-0">{d.label}</span>
                <div className="flex-1 bg-gray-100 rounded h-2">
                  <div className="bg-indigo-400 h-2 rounded" style={{width:`${(d.x/25)*100}%`}} />
                </div>
                <span className="text-xs text-gray-500 w-12">{d.x} proj.</span>
                <span className={`text-xs font-medium w-10 text-right ${d.y>=avgReal?'text-emerald-600':'text-red-500'}`}>{d.y}%</span>
              </div>
            ))}
          </div>
          <InsightBox text={corProjKpi.interpretation} variant={corProjKpi.significant?(corProjKpi.r>0?'ok':'danger'):'warn'} />
        </SectionCard>
      </div>

      <SectionCard title="Ranking komisji" sub="Posortowane według realizacji KPI — semestr letni 2025/2026">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="text-left py-2 font-normal">#</th>
            <th className="text-left py-2 font-normal">Komisja</th>
            <th className="text-right py-2 font-normal">Plan</th>
            <th className="text-right py-2 font-normal">Real.</th>
            <th className="text-right py-2 font-normal">KPI%</th>
            <th className="text-right py-2 font-normal">z-score</th>
            <th className="text-right py-2 font-normal">Ocena</th>
          </tr></thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 text-gray-400">{i+1}</td>
                <td className="py-2.5"><div className="font-medium text-gray-800">{p.komisja?.kod}</div><div className="text-xs text-gray-400">{p.komisja?.nazwa}</div></td>
                <td className="py-2.5 text-right text-gray-500">{p.projekty_planowane}</td>
                <td className="py-2.5 text-right text-gray-500">{p.projekty_zrealizowane}</td>
                <td className="py-2.5 text-right font-medium text-gray-800">{p.realizacjaPct}%</td>
                <td className="py-2.5 text-right" style={{color:p.z>0?'#0F6E56':'#993C1D'}}>{p.z>0?'+':''}{p.z.toFixed(2)}</td>
                <td className="py-2.5 text-right">{zBadge(p.z)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}
