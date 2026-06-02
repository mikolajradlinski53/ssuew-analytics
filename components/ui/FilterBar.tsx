'use client'
import { useFilters } from '@/lib/useFilters'

export function FilterBar() {
  const { filters, setFilters } = useFilters()
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Sezon"
        value={filters.sezon}
        onChange={(e) => setFilters({ ...filters, sezon: e.target.value as typeof filters.sezon })}
        className="bg-deck-panel border border-deck-border text-deck-muted text-[11px] rounded-md px-2 py-1"
      >
        <option value="all">Sezon: oba</option>
        <option value="jesien">Jesień</option>
        <option value="wiosna">Wiosna</option>
      </select>
      <input
        aria-label="Rok od"
        type="number"
        placeholder="od"
        value={filters.fromYear ?? ''}
        onChange={(e) =>
          setFilters({ ...filters, fromYear: e.target.value ? Number(e.target.value) : null })
        }
        className="w-16 bg-deck-panel border border-deck-border text-deck-muted text-[11px] rounded-md px-2 py-1"
      />
      <input
        aria-label="Rok do"
        type="number"
        placeholder="do"
        value={filters.toYear ?? ''}
        onChange={(e) =>
          setFilters({ ...filters, toYear: e.target.value ? Number(e.target.value) : null })
        }
        className="w-16 bg-deck-panel border border-deck-border text-deck-muted text-[11px] rounded-md px-2 py-1"
      />
    </div>
  )
}
