'use client'
import { Suspense, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { FilterBar } from './FilterBar'
import { ExportButton } from './ExportButton'
import { AuthStatus } from './AuthStatus'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-deck-bg-deep">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-5 py-3 border-b border-deck-border">
          <span className="text-[11px] text-deck-muted tracking-wide">SSUEW · ANALYTICS</span>
          <div className="flex items-center gap-3">
            <Suspense fallback={<div className="text-[11px] text-deck-muted">…</div>}>
              <FilterBar />
            </Suspense>
            <ExportButton />
            <AuthStatus />
          </div>
        </header>
        <main id="export-root" className="flex-1 p-5 max-w-[1200px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
