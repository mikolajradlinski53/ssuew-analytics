#!/usr/bin/env node
/**
 * Apps Script z terminala — bez klikania w edytorze.
 *
 *   npm run gas -- ping         jakie zakładki zna wdrożony skrypt
 *   npm run gas -- status       które pliki poszłyby do Google
 *   npm run gas -- wdroz        push + nowa wersja + podpięcie pod ten sam /exec + ping
 *   npm run gas -- setup        założenie brakujących zakładek (na wdrożonym skrypcie)
 *   npm run gas -- migruj-kpi   jednorazowa migracja kpi -> kpi_punkty
 *
 * GAS_URL i GAS_TOKEN czyta z .env.local. Wysyłka i wdrożenie idą przez clasp,
 * więc raz trzeba się zalogować: `npx clasp login`.
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

function env() {
  const out = {}
  for (const linia of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linia.match(/^([A-Z_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '')
  }
  if (!out.GAS_URL || !out.GAS_TOKEN) throw new Error('Brak GAS_URL albo GAS_TOKEN w .env.local')
  return out
}

/** Id wdrożenia siedzi w adresie: /macros/s/<id>/exec. */
function idWdrozenia(url) {
  const m = url.match(/\/macros\/s\/([^/]+)\/exec/)
  if (!m) throw new Error('GAS_URL nie wygląda na adres wdrożenia (/macros/s/…/exec)')
  return m[1]
}

/** Projekt clasp mieszka w apps-script/ — tam .clasp.json i .claspignore (tylko Kod.gs + manifest). */
function clasp(argumenty) {
  return execSync(`npx clasp ${argumenty}`, {
    cwd: 'apps-script',
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'inherit'],
  })
}

/** Apps Script odpowiada 200 także przy błędzie — prawda jest w polu `ok`. */
async function zapytaj(init) {
  const { GAS_URL, GAS_TOKEN } = env()
  const res = init
    ? await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: GAS_TOKEN, ...init }),
      })
    : await fetch(`${GAS_URL}?token=${encodeURIComponent(GAS_TOKEN)}&t=_ping`)
  const tekst = await res.text()
  let dane
  try {
    dane = JSON.parse(tekst)
  } catch {
    throw new Error(`Skrypt nie zwrócił JSON-a (strona logowania? sprawdź „Kto ma dostęp”): ${tekst.slice(0, 120)}`)
  }
  if (!dane.ok) throw new Error(`Skrypt odmówił (${dane.kod}): ${dane.error}`)
  return dane
}

const KOMENDY = {
  async ping() {
    const d = await zapytaj()
    console.log(`Wdrożony skrypt zna zakładki: ${d.zakladki.join(', ')}`)
  },

  async status() {
    process.stdout.write(clasp('show-file-status'))
  },

  async wdroz() {
    const id = idWdrozenia(env().GAS_URL)
    console.log('1/3 Wysyłam Kod.gs…')
    process.stdout.write(clasp('push --force'))

    console.log('2/3 Tworzę nową wersję…')
    const wersja = clasp(`create-version "DECK ${new Date().toISOString().slice(0, 16)}"`)
    const numer = wersja.match(/(\d+)/)?.[1]
    if (!numer) throw new Error(`Nie odczytałem numeru wersji z: ${wersja}`)

    console.log(`3/3 Podpinam wersję ${numer} pod istniejący adres /exec…`)
    process.stdout.write(clasp(`update-deployment ${id} -V ${numer} -d "DECK dane"`))

    await KOMENDY.ping()
  },

  async setup() {
    const d = await zapytaj({ op: '_admin', akcja: 'setup' })
    console.log(d.wynik)
  },

  async 'migruj-kpi'() {
    const d = await zapytaj({ op: '_admin', akcja: 'migrujKpi' })
    console.log(d.wynik)
  },
}

const komenda = process.argv[2]
if (!KOMENDY[komenda]) {
  console.error(`Użycie: npm run gas -- <${Object.keys(KOMENDY).join(' | ')}>`)
  process.exit(1)
}
KOMENDY[komenda]().catch((e) => {
  console.error(`✗ ${e.message}`)
  process.exit(1)
})
