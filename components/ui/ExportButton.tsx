'use client'
import { useState } from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

async function captureRoot(): Promise<string | null> {
  const node = document.getElementById('export-root')
  if (!node) return null
  return toPng(node, { backgroundColor: '#090B0E', pixelRatio: 2, cacheBust: true })
}

export function ExportButton() {
  const [busy, setBusy] = useState<null | 'png' | 'pdf'>(null)

  async function exportPng() {
    setBusy('png')
    try {
      const url = await captureRoot()
      if (!url) return
      const a = document.createElement('a')
      a.href = url
      a.download = `ssuew-${today()}.png`
      a.click()
    } catch {
      // zrzut nieudany — pomijamy po cichu
    } finally {
      setBusy(null)
    }
  }

  async function exportPdf() {
    setBusy('pdf')
    try {
      const url = await captureRoot()
      if (!url) return
      const img = new Image()
      img.src = url
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
      })
      const pdf = new jsPDF({
        orientation: img.width >= img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
      })
      pdf.addImage(url, 'PNG', 0, 0, img.width, img.height)
      pdf.save(`ssuew-${today()}.pdf`)
    } catch {
      // zrzut nieudany — pomijamy po cichu
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={exportPng} disabled={!!busy} className="text-[10px] px-2 py-1 rounded-md border border-deck-border text-deck-muted hover:text-deck-text disabled:opacity-40">
        {busy === 'png' ? '…' : 'PNG'}
      </button>
      <button onClick={exportPdf} disabled={!!busy} className="text-[10px] px-2 py-1 rounded-md border border-deck-border text-deck-muted hover:text-deck-text disabled:opacity-40">
        {busy === 'pdf' ? '…' : 'PDF'}
      </button>
    </div>
  )
}
