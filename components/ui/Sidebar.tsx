'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  GitBranch,
  LayoutDashboard,
  LineChart,
  Plus,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import { LogoMark } from './LogoMark'

export const NAV = [
  { href: '/', label: 'Przegląd', icon: LayoutDashboard },
  { href: '/rekrutacje', label: 'Rekrutacje', icon: BarChart3 },
  { href: '/retencja', label: 'Retencja', icon: Activity },
  { href: '/czlonkowie', label: 'Członkowie', icon: Users },
  { href: '/kpi', label: 'KPI', icon: LineChart },
  { href: '/lejek', label: 'Lejek', icon: GitBranch },
  { href: '/korelacje', label: 'Korelacje', icon: Brain },
  { href: '/prognozy', label: 'Prognozy', icon: Sparkles },
  { href: '/alerty', label: 'Alerty', icon: AlertTriangle },
] as const

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 h-screen w-[224px] shrink-0 border-r border-white/10 bg-deck-bg-deep/70 p-3 flex flex-col gap-2 backdrop-blur-2xl">
      <div className="deck-card rounded-lg p-3 mb-2">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <div className="text-sm font-semibold text-deck-text leading-none">SSUEW</div>
            <div className="text-[10px] text-deck-muted mt-1">Analytics Command</div>
          </div>
        </div>
      </div>
      {NAV.map((item) => {
        const active = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative text-xs px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all duration-200 ${
              active
                ? 'text-deck-accent bg-deck-accent/12 border border-deck-accent/35 shadow-[0_10px_26px_rgba(46,230,166,0.12)]'
                : 'text-deck-muted border border-transparent hover:text-deck-text hover:bg-white/[0.045]'
            }`}
          >
            <span className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${active ? 'bg-deck-accent text-deck-bg-deep' : 'bg-white/[0.055] text-deck-muted group-hover:text-deck-text'}`}>
              <Icon size={15} strokeWidth={2.1} />
            </span>
            {item.label}
            {active && <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-deck-accent shadow-[0_0_18px_rgba(46,230,166,0.9)]" />}
          </Link>
        )
      })}
      <Link
        href="/wpis"
        className="deck-button mt-auto flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold"
      >
        <Plus size={15} />
        Wpisz dane
      </Link>
      <div className="flex items-center gap-2 px-2 pt-2 text-[10px] text-deck-muted">
        <UserRound size={12} />
        Private strategy deck
      </div>
    </aside>
  )
}
