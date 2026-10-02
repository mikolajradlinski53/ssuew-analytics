import { Fragment, type ReactNode } from 'react'

export type Kawalek = { typ: 'akapit'; linie: string[] } | { typ: 'lista'; punkty: string[] }

/** Tyle formatowania, ile prosi instrukcja czatu: akapity, „- ” i **pogrubienie**. Bez biblioteki markdown. */
export function naKawalki(tekst: string): Kawalek[] {
  const wynik: Kawalek[] = []
  for (const blok of tekst.trim().split(/\n\s*\n/)) {
    let biezacy: Kawalek | null = null
    for (const linia of blok.split('\n')) {
      const punkt = linia.match(/^\s*[-*•] (.*)$/)
      if (punkt) {
        if (biezacy?.typ !== 'lista') {
          biezacy = { typ: 'lista', punkty: [] }
          wynik.push(biezacy)
        }
        biezacy.punkty.push(punkt[1].trim())
      } else if (linia.trim()) {
        if (biezacy?.typ !== 'akapit') {
          biezacy = { typ: 'akapit', linie: [] }
          wynik.push(biezacy)
        }
        biezacy.linie.push(linia.trim())
      }
    }
  }
  return wynik
}

function pogrubienia(tekst: string): ReactNode[] {
  return tekst
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((c, i) => (c.startsWith('**') && c.endsWith('**') && c.length > 4 ? <strong key={i}>{c.slice(2, -2)}</strong> : c))
}

export function TekstAsystenta({ tekst }: { tekst: string }) {
  return (
    <div className="space-y-2">
      {naKawalki(tekst).map((k, i) =>
        k.typ === 'lista' ? (
          <ul key={i} className="list-disc space-y-1 pl-4 marker:text-deck-accent">
            {k.punkty.map((p, j) => <li key={j}>{pogrubienia(p)}</li>)}
          </ul>
        ) : (
          <p key={i}>
            {k.linie.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {pogrubienia(l)}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  )
}
