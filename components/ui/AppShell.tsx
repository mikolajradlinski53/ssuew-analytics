'use client'
import { Suspense, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { FilterBar } from './FilterBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-deck-bg-deep">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-5 py-3 border-b border-deck-border">
          <span className="text-[11px] text-deck-muted tracking-wide">SSUEW · ANALYTICS</span>
          <Suspense fallback={<div className="text-[11px] text-deck-muted">…</div>}>
            <FilterBar />
          </Suspense>
        </header>
        <main className="flex-1 p-5 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
