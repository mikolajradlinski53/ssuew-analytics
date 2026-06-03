'use client'
import { useEffect, useMemo, useState } from 'react'
import { useCzlonkowie } from '@/lib/useCzlonkowie'
import { useAnalyticsData } from '@/lib/useAnalyticsData'
import { isConfigured } from '@/lib/supabase/config'
import { kolejneSemestry, memberStatusCounts, survivalFromMembers } from '@/lib/stats'
import type { Czlonek, CzlonekStatus, Sezon } from '@/types'
import { BentoCard } from '@/components/ui/BentoCard'
import { ModuleSkeleton } from '@/components/ui/ModuleSkeleton'

const STATUSES: CzlonekStatus[] = ['aktywny', 'wspierający', 'alumn', 'zawieszone', 'nieaktywny']
const STATUS_COLOR: Record<CzlonekStatus, string> = {
  aktywny: '#2EE6A6',
  'wspierający': '#8B7CF6',
  alumn: '#B5D4F4',
  zawieszone: '#d9b06a',
  nieaktywny: '#7D8590',
}
const CELL_COLOR = ['#21262D', '#2EE6A6', '#8B7CF6'] // 0=nieaktywny, 1=aktywny, 2=wspierający

function colsForCohort(sezon: Sezon, rok: number) {
  const all = kolejneSemestry(sezon, rok, 12)
  const idx = all.findIndex((s) => s.label === "W'27")
  return idx >= 0 ? all.slice(0, idx + 1) : all.slice(0, 6)
}

export default function CzlonkowieClient() {
  const { czlonkowie, loading, usingDemo, updateCzlonek, addCzlonek } = useCzlonkowie()
  const { kohorty } = useAnalyticsData()
  const [edycja, setEdycja] = useState('')
  const [rows, setRows] = useState<Czlonek[]>([])
  const [newName, setNewName] = useState('')

  const cohortList = useMemo(
    () => kohorty.map((k) => ({ edycja: k.edycja, sezon: k.sezon, rok: k.rok })),
    [kohorty],
  )

  useEffect(() => {
    if (!edycja && cohortList.length) setEdycja(cohortList[0].edycja)
  }, [cohortList, edycja])

  useEffect(() => {
    setRows(czlonkowie.filter((c) => c.kohorta_edycja === edycja))
  }, [czlonkowie, edycja])

  if (loading) return <ModuleSkeleton variant="czlonkowie" />

  const cohort = cohortList.find((c) => c.edycja === edycja)
  const cols = cohort ? colsForCohort(cohort.sezon, cohort.rok) : []
  const editable = isConfigured
  const counts = memberStatusCounts(rows)
  const survival = survivalFromMembers(rows)
  const avgSigma = rows.length
    ? rows.reduce((s, m) => s + m.aktywnosc.filter((v) => v > 0).length, 0) / rows.length
    : 0
  const w = 200
  const pts = survival
    .map((v, i) => `${(i / Math.max(1, survival.length - 1)) * w},${34 - (v / 100) * 32}`)
    .join(' ')

  function cycleCell(member: Czlonek, ci: number) {
    if (!editable) return
    setRows((prev) =>
      prev.map((m) => {
        if (m.id !== member.id) return m
        const akt = [...m.aktywnosc]
        while (akt.length < cols.length) akt.push(0)
        akt[ci] = ((akt[ci] ?? 0) + 1) % 3
        updateCzlonek(m.id, { aktywnosc: akt }).catch(() => {})
        return { ...m, aktywnosc: akt }
      }),
    )
  }

  function changeStatus(member: Czlonek, status: CzlonekStatus) {
    if (!editable) return
    setRows((prev) => prev.map((m) => (m.id === member.id ? { ...m, status } : m)))
    updateCzlonek(member.id, { status }).catch(() => {})
  }

  async function addMember() {
    if (!editable || !newName.trim() || !edycja) return
    await addCzlonek({ kohorta_edycja: edycja, imie_nazwisko: newName.trim(), status: 'aktywny', aktywnosc: cols.map(() => 0) })
    setNewName('')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={edycja}
          onChange={(e) => setEdycja(e.target.value)}
          className="bg-deck-panel border border-deck-border text-deck-text text-[11px] rounded-md px-2 py-1"
        >
          {cohortList.map((c) => (
            <option key={c.edycja} value={c.edycja}>Kohorta {c.edycja}</option>
          ))}
        </select>
        <span className="text-[11px] text-deck-muted">{rows.length} członków</span>
        {usingDemo && <span className="text-[10px] text-deck-warn">demo (zaślepione) — edycja po wdrożeniu Supabase</span>}
        {!editable && !usingDemo && <span className="text-[10px] text-deck-warn">tryb demo — read-only</span>}
      </div>

      {/* Podsumowanie na bieżąco */}
      <BentoCard title="Podsumowanie kohorty" sub="liczone na bieżąco z siatki" span={4}>
        <div className="flex items-center gap-4 flex-wrap text-[11px] tabular">
          <span style={{ color: STATUS_COLOR.aktywny }}>aktywni: <b>{counts.aktywny}</b></span>
          <span style={{ color: STATUS_COLOR['wspierający'] }}>wspierający: <b>{counts['wspierający']}</b></span>
          <span style={{ color: STATUS_COLOR.alumn }}>alumni: <b>{counts.alumn}</b></span>
          <span style={{ color: STATUS_COLOR.zawieszone }}>zawieszone: <b>{counts.zawieszone}</b></span>
          <span style={{ color: STATUS_COLOR.nieaktywny }}>nieaktywni: <b>{counts.nieaktywny}</b></span>
          <span className="text-deck-text">avg Σ: <b>{avgSigma.toFixed(2)}</b> sem</span>
          <svg viewBox="0 0 200 34" className="ml-auto" style={{ width: 160, height: 34 }}>
            <polyline points={pts} fill="none" stroke="#2EE6A6" strokeWidth={2} />
          </svg>
        </div>
      </BentoCard>

      <BentoCard title={`Siatka aktywności — kohorta ${edycja}`} sub="klik komórki: pusty → aktywny → wspierający" span={4}>
        <div className="overflow-x-auto">
          <table className="border-collapse text-[11px] w-full">
            <thead>
              <tr className="text-deck-muted text-left">
                <th className="p-1 font-medium">Imię i Nazwisko</th>
                {cols.map((c) => <th key={c.label} className="p-1 text-center">{c.label}</th>)}
                <th className="p-1 text-center">Σ</th>
                <th className="p-1">status</th>
              </tr>
            </thead>
            <tbody className="text-deck-text">
              {rows.map((m) => {
                const sigma = m.aktywnosc.filter((v) => v > 0).length
                return (
                  <tr key={m.id} className="border-t border-deck-border">
                    <td className="p-1 whitespace-nowrap">{m.imie_nazwisko}</td>
                    {cols.map((_, ci) => {
                      const state = m.aktywnosc[ci] ?? 0
                      return (
                        <td key={ci} className="p-1 text-center">
                          <span
                            onClick={() => cycleCell(m, ci)}
                            className="inline-block w-4 h-4 rounded-sm"
                            style={{ background: CELL_COLOR[state], cursor: editable ? 'pointer' : 'default' }}
                          />
                        </td>
                      )
                    })}
                    <td className="p-1 text-center tabular text-deck-accent font-semibold">{sigma}</td>
                    <td className="p-1">
                      <select
                        value={m.status}
                        disabled={!editable}
                        onChange={(e) => changeStatus(m, e.target.value as CzlonekStatus)}
                        className="bg-deck-bg border border-deck-border rounded-md px-1.5 py-0.5 text-[11px]"
                        style={{ color: STATUS_COLOR[m.status] }}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={cols.length + 3} className="p-2 text-deck-muted text-center">Brak członków w tej kohorcie.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {editable && (
          <div className="flex items-center gap-2 mt-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Imię i nazwisko nowej osoby"
              className="flex-1 max-w-xs bg-deck-bg border border-deck-border rounded-md px-2 py-1 text-[11px] text-deck-text"
            />
            <button onClick={addMember} disabled={!newName.trim()} className="text-[11px] px-3 py-1 rounded-md border border-deck-accent/40 text-deck-accent disabled:opacity-40">
              + dodaj osobę
            </button>
          </div>
        )}

        <div className="flex gap-3 mt-3 text-[9px] text-deck-muted">
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle" style={{ background: '#2EE6A6' }} /> aktywny</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle" style={{ background: '#8B7CF6' }} /> wspierający</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle" style={{ background: '#21262D' }} /> nieaktywny</span>
        </div>
      </BentoCard>
    </div>
  )
}
