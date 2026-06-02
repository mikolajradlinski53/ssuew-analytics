'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const NAV = [
  { href: '/', label: 'Przegląd', glyph: '◧' },
  { href: '/rekrutacje', label: 'Rekrutacje', glyph: '↗' },
  { href: '/retencja', label: 'Retencja', glyph: '⟲' },
  { href: '/komisje', label: 'Komisje', glyph: '▦' },
  { href: '/lejek', label: 'Lejek', glyph: '⥥' },
  { href: '/korelacje', label: 'Korelacje', glyph: '∿' },
  { href: '/prognozy', label: 'Prognozy', glyph: '◔' },
  { href: '/alerty', label: 'Alerty', glyph: '⚠' },
] as const

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-[150px] shrink-0 bg-deck-bg border-r border-deck-border p-2 flex flex-col gap-1 min-h-screen">
      <div className="flex items-center gap-2 px-2 py-3">
        <span className="w-6 h-6 rounded-md bg-deck-accent text-deck-bg-deep font-extrabold text-xs flex items-center justify-center">
          S
        </span>
        <span className="text-sm font-semibold text-deck-text">SSUEW</span>
      </div>
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-xs px-2 py-1.5 rounded-md flex items-center gap-2 ${
              active
                ? 'bg-deck-accent/10 text-deck-accent border border-deck-accent/40'
                : 'text-deck-muted hover:text-deck-text'
            }`}
          >
            <span aria-hidden>{item.glyph}</span>
            {item.label}
          </Link>
        )
      })}
      <Link
        href="/wpis"
        className="mt-auto text-xs px-2 py-1.5 rounded-md text-deck-muted hover:text-deck-text border-t border-deck-border pt-3"
      >
        ＋ Wpisz dane
      </Link>
    </aside>
  )
}
