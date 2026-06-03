'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut, UserCircle } from 'lucide-react'
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
      <Link href="/login" className="deck-chip flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] text-deck-muted transition hover:text-deck-text">
        <LogIn size={14} />
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
    <div className="deck-chip flex h-9 items-center gap-2 rounded-lg px-2">
      <UserCircle size={15} className="text-deck-accent" />
      <span className="max-w-[150px] truncate text-[10px] text-deck-muted">{email}</span>
      <button
        type="button"
        onClick={logout}
        className="grid h-6 w-6 place-items-center rounded-md text-deck-muted transition hover:bg-white/8 hover:text-deck-text"
        title="Wyloguj"
      >
        <LogOut size={13} />
      </button>
    </div>
  )
}
