'use client'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Kohorta } from '@/types'
import type { RegressionResult } from '@/types'
import { mean } from '@/lib/stats'

type Props = { kohorty: Kohorta[]; result: RegressionResult }

function InsightBox({ text, variant = 'info' }: { text: string; variant?: 'info' | 'warn' | 'ok' | 'danger' }) {
  const cls = { info:'border-indigo-500 bg-indigo-50 text-indigo-800', ok:'border-emerald-500 bg-emerald-50 text-emerald-800', warn:'border-amber-500 bg-amber-50 text-amber-800', danger:'border-red-500 bg-red-50 text-red-800' }[variant]
  return <div className={`border-l-[3px] rounded-r-lg p-3 text-sm leading-relaxed mt-3 ${cls}`}>{text}</div>
}
function ExplainBox({ children }: { children: React.ReactNode }) {
  return <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed mt-3">{children}</div>
}
function SectionCard({ title, sub, children }: { title:string; sub?:string; children:React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
      <div className="mb-4"><h3 className="text-sm font-medium text-gray-900">{title}</h3>{sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}</div>
      {children}
    </div>
  )
}

function survivalPoints(avgRet: number) {
  return [0,1,2,3,4,5,6].map(s => ({
    sem: `Sem ${s}`,
    pct: parseFloat(Math.max(0, Math.exp(-s / avgRet) * 100).toFixed(1))
  }))
}

export default function ModuleRetention({ kohorty, result }: Props) {
  const complete = kohorty.filter(k => !k.in_progress)
  const avgRet = complete.length ? mean(complete.map(k => k.avg_retention_sem)) : 0

  const retBarData = [...kohorty].sort((a,b)=>a.rok-b.rok).map(k => ({
    edycja: k.edycja,
    'avg retention': k.avg_retention_sem,
    in_progress: k.in_progress,
  }))

  const survW22 = survivalPoints(4.36)
  const survJ22 = survivalPoints(4.24)
  const survJ24 = survivalPoints(3.53)
  const survW24 = survivalPoints(2.69)

  const survData = survW22.map((p, i) => ({
    sem: p.sem,
    "W'22 (4.36)": p.pct,
    "J'22 (4.24)": survJ22[i].pct,
    "J'24 (3.53)": survJ24[i].pct,
    "W'24 (2.69)": survW24[i].pct,
  }))

  const r2pct = (result.r2 * 100).toFixed(1)
  const r2variant: 'ok'|'warn'|'danger' = result.r2 > 0.6 ? 'ok' : result.r2 > 0.35 ? 'warn' : 'danger'

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-4"><div className="text-xs text-gray-500 mb-1">Avg retention (ukończone)</div><div className="text-xl font-medium text-gray-900">{avgRet.toFixed(2)} sem.</div><div className="text-xs text-gray-400 mt-1">benchmark organizacyjny</div></div>
        <div className="bg-gray-50 rounded-lg p-4"><div className="text-xs text-gray-500 mb-1">Najlepsza kohorta</div><div className="text-xl font-medium text-emerald-700">{complete.length ? Math.max(...complete.map(k=>k.avg_retention_sem)).toFixed(2) : '—'} sem.</div><div className="text-xs text-gray-400 mt-1">{complete.sort((a,b)=>b.avg_retention_sem-a.avg_retention_sem)[0]?.edycja}</div></div>
        <div className="bg-gray-50 rounded-lg p-4"><div className="text-xs text-gray-500 mb-1">Prognoza J'26</div><div className={`text-xl font-medium ${result.prediction < 3 ? 'text-red-600' : 'text-indigo-700'}`}>{result.prediction > 0 ? result.prediction.toFixed(2) + ' sem.' : '—'}</div><div className="text-xs text-gray-400 mt-1">model OLS</div></div>
        <div className="bg-gray-50 rounded-lg p-4"><div className="text-xs text-gray-500 mb-1">R² modelu regresji</div><div className={`text-xl font-medium ${result.r2 > 0.6 ? 'text-emerald-700' : result.r2 > 0.35 ? 'text-amber-700' : 'text-red-600'}`}>{result.r2 > 0 ? r2pct + '%' : '—'}</div><div className="text-xs text-gray-400 mt-1">wariancja wyjaśniona</div></div>
      </div>

      <SectionCard title="Avg retention per kohorta" sub="Ukończone kohorty + kohorty in-progress (⚠ wartości zaniżone)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={retBarData} layout="vertical" margin={{ top:4, right:40, left:40, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tickFormatter={v=>v+' sem.'} tick={{fontSize:10,fill:'#888'}} domain={[0,5]} />
            <YAxis type="category" dataKey="edycja" tick={{fontSize:11,fill:'#888'}} width={40} />
            <Tooltip formatter={(v)=>String(v)+' sem.'} contentStyle={{fontSize:12}} />
            <ReferenceLine x={avgRet} stroke="#e5e7eb" strokeDasharray="4 2" label={{value:'avg',fontSize:10,fill:'#999',position:'top'}} />
            <Bar dataKey="avg retention" radius={[0,3,3,0]}
              fill="#1D9E75"
              label={{ position: 'right', fontSize: 10, fill: '#555', formatter: (v: unknown) => Number(v) > 0 ? Number(v).toFixed(2) : '⚠ in-progress' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Survival curve — symulacja kohortowa" sub="Procent aktywnych członków per semestr od dołączenia · model wykładniczy">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={survData} margin={{top:4,right:8,left:-15,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="sem" tick={{fontSize:10,fill:'#888'}} />
            <YAxis tickFormatter={v=>v+'%'} tick={{fontSize:10,fill:'#888'}} domain={[0,105]} />
            <Tooltip formatter={(v)=>Number(v).toFixed(1)+'%'} contentStyle={{fontSize:12}} />
            <Legend wrapperStyle={{fontSize:11,paddingTop:8}} />
            <Line type="monotone" dataKey="W'22 (4.36)" stroke="#1D9E75" strokeWidth={2} dot={{r:3}} />
            <Line type="monotone" dataKey="J'22 (4.24)" stroke="#378ADD" strokeWidth={2} dot={{r:3}} />
            <Line type="monotone" dataKey="J'24 (3.53)" stroke="#534AB7" strokeWidth={1.5} strokeDasharray="5 3" dot={{r:3}} />
            <Line type="monotone" dataKey="W'24 (2.69)" stroke="#D85A30" strokeWidth={1.5} strokeDasharray="3 3" dot={{r:3}} />
          </LineChart>
        </ResponsiveContainer>
        <ExplainBox>
          <strong className="text-gray-700">Survival curve</strong> — pokazuje, jaki procent członków danej kohorty pozostaje aktywny po N semestrach.
          Model: S(t) = e^(−t/avg_retention). Im wolniejszy spadek, tym lepsza retencja.
          Krzywe zbliżające się do osi X szybciej oznaczają kohorty, które rozpadają się wcześniej.
        </ExplainBox>
      </SectionCard>

      {result.coefficients.length > 0 && (
        <SectionCard
          title="Regresja wielokrotna OLS — co napędza retention?"
          sub={`R²=${r2pct}% · zmienne: nr edycji, sezon, liczba przyjętych · n=${complete.length} kohort`}
        >
          {result.warning && <InsightBox text={result.warning} variant="warn" />}
          <div className="mt-4 space-y-3">
            {result.coefficients.map(coef => {
              const absMax = Math.max(...result.coefficients.map(c=>Math.abs(c.beta)))
              const widthPct = Math.min(100, (Math.abs(coef.beta) / absMax) * 100)
              return (
                <div key={coef.name}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-gray-500 w-52 shrink-0">{coef.name}</span>
                    <div className="flex-1 bg-gray-100 rounded h-2">
                      <div className="h-2 rounded" style={{ width: `${widthPct}%`, background: coef.beta > 0 ? '#1D9E75' : '#E24B4A' }} />
                    </div>
                    <span className="text-sm font-medium w-16 text-right" style={{ color: coef.beta > 0 ? '#0F6E56' : '#993C1D' }}>
                      {coef.beta > 0 ? '+' : ''}{coef.beta.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 pl-[220px] leading-relaxed">{coef.interpretation}</p>
                </div>
              )
            })}
          </div>
          <InsightBox
            text={`R²=${r2pct}% — model wyjaśnia ${r2pct}% zmienności retention. ${result.r2 > 0.6 ? 'Dobre dopasowanie.' : result.r2 > 0.35 ? 'Umiarkowane — część czynników (jakość onboardingu, obciążenie sesją) nie jest jeszcze mierzona.' : 'Słabe dopasowanie — kluczowe zmienne pozostają niezidentyfikowane. Rozważ ankiety jakościowe.'} Prognoza J'26: ${result.prediction.toFixed(2)} sem.${result.prediction < 3.0 ? ' — poniżej benchmarku 3.8 sem. Interwencja strukturalna rekomendowana.' : '.'}`}
            variant={r2variant}
          />
          <ExplainBox>
            <strong className="text-gray-700">Regresja OLS wielokrotna</strong> — każda zmienna dostaje współczynnik β mówiący:
            o ile zmienia się retention gdy ta zmienna rośnie o 1, przy pozostałych stałych.
            Pasek pokazuje względną siłę wpływu. Zielony = dodatni wpływ, czerwony = negatywny.
            <strong className="text-gray-700"> Uwaga:</strong> przy n={complete.length} kohortach model jest orientacyjny — przy n≥10 wyniki będą statystycznie twarde.
          </ExplainBox>
        </SectionCard>
      )}
    </div>
  )
}
