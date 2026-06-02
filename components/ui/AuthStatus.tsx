'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isConfigured } from '@/lib/supabase/config'

export function AuthStatus() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!isConfigured) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return null

  if (!email) {
    return (
      <Link href="/login" className="text-[10px] px-2 py-1 rounded-md border border-deck-border text-deck-muted hover:text-deck-text">
        Zaloguj
      </Link>
    )
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setEmail(null)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-deck-muted max-w-[140px] truncate">{email}</span>
      <button onClick={logout} className="text-[10px] px-2 py-1 rounded-md border border-deck-border text-deck-muted hover:text-deck-text">
        Wyloguj
      </button>
    </div>
  )
}
