import type { ReactNode } from 'react'

type Props = {
  title?: string
  sub?: string
  span?: 1 | 2 | 3 | 4
  tone?: 'default' | 'danger'
  className?: string
  children: ReactNode
}

const spanClass: Record<NonNullable<Props['span']>, string> = {
  1: '',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
}

export function BentoCard({ title, sub, span = 1, tone = 'default', className = '', children }: Props) {
  const toneClass =
    tone === 'danger'
      ? 'bg-deck-danger-bg border-deck-danger-border'
      : 'bg-deck-panel border-deck-border'
  return (
    <div className={`${spanClass[span]} ${toneClass} border rounded-lg p-3 ${className}`.trim()}>
      {title && (
        <div className="mb-2">
          <div className="text-xs text-deck-text">{title}</div>
          {sub && <div className="text-[10px] text-deck-muted">{sub}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
