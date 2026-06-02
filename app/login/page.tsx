'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isConfigured } from '@/lib/supabase/config'
import { BentoCard } from '@/components/ui/BentoCard'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [haslo, setHaslo] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isConfigured) {
      setErr('Supabase nie jest skonfigurowany (tryb demo).')
      return
    }
    setBusy(true)
    setErr(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: haslo })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <BentoCard title="Logowanie" sub="dostęp do zapisu danych">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-deck-muted mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-deck-bg border border-deck-border rounded-md px-3 py-2 text-sm text-deck-text"
            />
          </div>
          <div>
            <label className="block text-[11px] text-deck-muted mb-1">Hasło</label>
            <input
              type="password"
              value={haslo}
              onChange={(e) => setHaslo(e.target.value)}
              className="w-full bg-deck-bg border border-deck-border rounded-md px-3 py-2 text-sm text-deck-text"
            />
          </div>
          {err && <div className="text-[11px] text-deck-danger">{err}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-deck-accent text-deck-bg-deep rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? 'Logowanie…' : 'Zaloguj'}
          </button>
        </form>
      </BentoCard>
    </div>
  )
}
