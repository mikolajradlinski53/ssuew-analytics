'use client'

type Props = {
  label: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
}

export function Slider({ label, min, max, value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-deck-muted">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-deck-accent"
      />
      <span className="text-deck-text tabular-nums w-6 text-right">{value}</span>
    </label>
  )
}
