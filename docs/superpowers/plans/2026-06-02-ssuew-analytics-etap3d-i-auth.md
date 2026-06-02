# SSUEW Analytics 2.0 — Etap 3d-i (Logowanie Supabase Auth) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Logowanie e-mail+hasło (Supabase Auth, sesje cookie przez `@supabase/ssr`), zapisy jako `authenticated`, stan sesji w topbarze — fundament pod formularze wpisu (3d-ii).

**Architecture:** Trójwarstwowy klient Supabase (config / browser / server) + `middleware.ts` odświeżający sesję. API routes migrują na server client (POST jako authenticated → RLS OK). Strona `/login` + `AuthStatus` w `AppShell`. Tryb demo chroniony przez `isConfigured`.

**Tech Stack:** Next.js 16 App Router, React 19, `@supabase/ssr`, TypeScript strict, Vitest.

**Start:** bezpośrednio na `main`. Weryfikacja na żywym Supabase użytkownika.

---

## Struktura plików

**Tworzone:** `lib/supabase/config.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/config.test.ts`, `middleware.ts`, `app/login/page.tsx`, `components/ui/AuthStatus.tsx`.
**Modyfikowane:** `app/api/rekrutacje/route.ts`, `app/api/komisje/route.ts`, `components/ui/AppShell.tsx`, `package.json`.
**Usuwane:** `lib/supabase.ts` (zastąpione przez `lib/supabase/*`).

---

## Task 1: Zależność @supabase/ssr

**Files:** Modify: `package.json`

- [ ] **Step 1: Instalacja**

Run: `npm install @supabase/ssr`
Expected: dodane do `dependencies`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: dodaj @supabase/ssr"
```

---

## Task 2: Warstwa klienta Supabase (config/client/server) + migracja API

**Files:**
- Create: `lib/supabase/config.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/config.test.ts`
- Modify: `app/api/rekrutacje/route.ts`, `app/api/komisje/route.ts`
- Delete: `lib/supabase.ts`

- [ ] **Step 1: Potwierdź importerów starego `lib/supabase.ts`**

Użyj narzędzia Grep: wzorzec `@/lib/supabase'` (dokładnie, z apostrofem) w `app components lib`.
Expected: tylko `app/api/rekrutacje/route.ts` i `app/api/komisje/route.ts`. (Migrujemy oba w tym tasku.)

- [ ] **Step 2: Failing test `lib/supabase/config.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { isConfigured, SUPABASE_URL } from '@/lib/supabase/config'

describe('supabase config', () => {
  it('eksportuje boolean isConfigured', () => {
    expect(typeof isConfigured).toBe('boolean')
  })
  it('isConfigured=false dla placeholdera (brak env w teście)', () => {
    // W środowisku testowym brak NEXT_PUBLIC_SUPABASE_URL → placeholder
    expect(isConfigured).toBe(SUPABASE_URL !== 'https://placeholder.supabase.co' ? true : false)
  })
})
```

- [ ] **Step 3: Run — expect FAIL**

Run: `npx vitest run lib/supabase/config.test.ts`
Expected: FAIL (brak modułu).

- [ ] **Step 4: Create `lib/supabase/config.ts`**

```ts
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
export const isConfigured = SUPABASE_URL !== 'https://placeholder.supabase.co'
```

- [ ] **Step 5: Create `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON } from './config'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
}
```

- [ ] **Step 6: Create `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_ANON } from './config'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // wywołane z Server Component — sesję odświeża middleware
        }
      },
    },
  })
}
```

- [ ] **Step 7: Run config test — expect PASS**

Run: `npx vitest run lib/supabase/config.test.ts`
Expected: PASS.

- [ ] **Step 8: Migracja `app/api/rekrutacje/route.ts`** (pełna zawartość)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/supabase/config'

export async function GET() {
  if (!isConfigured) return NextResponse.json([])
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rekrutacje').select('*')
    .order('rok', { ascending: true }).order('sezon', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isConfigured) return NextResponse.json({ error: 'Supabase nie skonfigurowany' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  const body = await req.json()
  const { edycja, sezon, rok, zgloszenia, przyjeci } = body
  if (!edycja || !sezon || !rok || zgloszenia == null || przyjeci == null)
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  const { data, error } = await supabase.from('rekrutacje')
    .upsert({ edycja, sezon, rok, zgloszenia, przyjeci }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 9: Migracja `app/api/komisje/route.ts`** (pełna zawartość)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/supabase/config'

export async function GET() {
  if (!isConfigured) return NextResponse.json([])
  const supabase = await createClient()
  const { data, error } = await supabase.from('kpi_periods')
    .select('*, komisja:komisje(*)').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isConfigured) return NextResponse.json({ error: 'Supabase nie skonfigurowany' }, { status: 503 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Wymagane logowanie' }, { status: 401 })
  const body = await req.json()
  const { komisja_id, semestr, projekty_planowane, projekty_zrealizowane, kpi_custom, notatka } = body
  if (!komisja_id || !semestr || !projekty_planowane || projekty_zrealizowane == null)
    return NextResponse.json({ error: 'Brakujące pola' }, { status: 400 })
  const { data, error } = await supabase.from('kpi_periods')
    .upsert({ komisja_id, semestr, projekty_planowane, projekty_zrealizowane, kpi_custom: kpi_custom ?? {}, notatka })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 10: Usuń stary `lib/supabase.ts`**

```bash
git rm lib/supabase.ts
```

- [ ] **Step 11: Typecheck**

Run: `npx tsc --noEmit`
Expected: brak błędów (żaden plik nie importuje już `@/lib/supabase`).

- [ ] **Step 12: Commit**

```bash
git add lib/supabase app/api/rekrutacje/route.ts app/api/komisje/route.ts
git commit -m "feat(auth): warstwa Supabase SSR (config/client/server) + API jako authenticated"
```

---

## Task 3: Middleware (odświeżanie sesji)

**Files:** Create: `middleware.ts`

- [ ] **Step 1: Create `middleware.ts`** (root projektu)

```ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON, isConfigured } from '@/lib/supabase/config'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (!isConfigured) return response

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`; w logu „Middleware".

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): middleware odswiezajace sesje Supabase"
```

---

## Task 4: Strona logowania

**Files:** Create: `app/login/page.tsx`

- [ ] **Step 1: Create `app/login/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK; trasa `/login`.

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat(auth): strona logowania /login"
```

---

## Task 5: AuthStatus w topbarze

**Files:**
- Create: `components/ui/AuthStatus.tsx`
- Modify: `components/ui/AppShell.tsx`

- [ ] **Step 1: Create `components/ui/AuthStatus.tsx`**

```tsx
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
```

- [ ] **Step 2: Dodaj `AuthStatus` do `components/ui/AppShell.tsx`** — dodaj import:

```tsx
import { AuthStatus } from './AuthStatus'
```

oraz w `<header>`, w `<div className="flex items-center gap-3">`, po `<ExportButton />` dodaj `<AuthStatus />`:

```tsx
            <ExportButton />
            <AuthStatus />
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK.

- [ ] **Step 4: Commit**

```bash
git add components/ui/AuthStatus.tsx components/ui/AppShell.tsx
git commit -m "feat(auth): status sesji (login/logout) w topbarze"
```

---

## Task 6: Finalna weryfikacja (build + testy) + push

- [ ] **Step 1: Testy**

Run: `npm test`
Expected: wszystkie PASS (poprzednie + `config`).

- [ ] **Step 2: Typy + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build OK; w logu trasy `/login` i „Middleware".

- [ ] **Step 3: Push na main**

```bash
git push origin main
```

- [ ] **Step 4: Weryfikacja na żywo (z użytkownikiem)**

1. Użytkownik: w panelu Supabase włącz provider **Email** i utwórz testowego usera (Authentication → Users → Add user, **auto-confirm**).
2. Upewnij się, że `.env.local` ma `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. `npm run dev` → wejdź na `/login`, zaloguj się danymi testowego usera.
4. Sprawdź: w topbarze pojawia się e-mail + „Wyloguj"; po „Wyloguj" wraca „Zaloguj".
5. (Opcjonalnie) potwierdź w zakładce sieć, że żądania nie zwracają 401 dla zalogowanego.

---

## Notatki dla wykonawcy

- **Wzorzec `@supabase/ssr`** — trzymać się dokładnie `getAll`/`setAll`; `cookies()` jest **async** w Next 16 (`await cookies()`).
- **Tryb demo:** `isConfigured=false` → middleware i AuthStatus nie robią nic; aplikacja działa na danych demo bez logowania.
- **Sekrety:** nie wypisywać zawartości `.env*`; `.env*` w `.gitignore`.
- **Poza zakresem (3d-ii):** `/api/kohorty`, formularze wpisu, nowe grupy KPI, gating tras zapisu w UI.
```
