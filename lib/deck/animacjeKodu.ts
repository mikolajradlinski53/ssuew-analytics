/**
 * Trzy sposoby, w jakie sześć kratek kodu zbiera się w jedno po wpisaniu
 * ostatniej cyfry. Ruchy liczą rzeczywiste pozycje slotów, więc muszą żyć
 * w JavaScripcie — w CSS-ie nie da się obrócić czegoś wokół punktu, którego
 * położenie znamy dopiero po ułożeniu strony.
 */

/** Rozpęd i hamowanie: lekkie cofnięcie przed ruchem, potem twarde zatrzymanie. */
export const ROZPED_HAMOWANIE = 'cubic-bezier(.7, -0.35, .2, 1)'

export type Sprzatanie = () => void

function srodek(el: Element) {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function sprzataczka(animacje: Animation[]): Sprzatanie {
  return () => animacje.forEach((a) => a.cancel())
}

/**
 * Orbita: każdy slot krąży wokół wspólnego środka rzędu.
 *
 * Sztuczka jest w przesunięciu punktu obrotu do środka rzędu — wtedy zwykły
 * `rotate()` rysuje dokładny okrąg i wystarczą dwie klatki. Próbkowanie toru
 * po kawałku dawałoby wielokąt i widoczne szarpanie.
 */
export function orbita(sloty: HTMLElement[], rzad: HTMLElement): Sprzatanie {
  const hub = srodek(rzad)
  const animacje = sloty.map((slot, i) => {
    const r = slot.getBoundingClientRect()
    slot.style.transformOrigin = `${hub.x - r.left}px ${hub.y - r.top}px`
    return slot.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(450deg)' }],
      { duration: 800, delay: i * 40, easing: ROZPED_HAMOWANIE, fill: 'both' },
    )
  })
  return () => {
    sloty.forEach((s) => (s.style.transformOrigin = ''))
    sprzataczka(animacje)()
  }
}

/**
 * Obwód: sloty przechylają się w głąb i jadą łukiem, nie po prostej.
 *
 * Obracają się wokół środka całego rzędu, a nie własnego — dlatego tor jest
 * łukiem. Rodzic ma `perspective`, więc przechylenie widać jako głębię.
 */
export function obwod(sloty: HTMLElement[], rzad: HTMLElement): Sprzatanie {
  const hub = srodek(rzad)
  const T = (42 * Math.PI) / 180
  const animacje = sloty.map((slot, i) => {
    const s = srodek(slot)
    const rx = hub.x - s.x
    const ry = hub.y - s.y
    const mx = rx * Math.cos(T) - ry * Math.sin(T)
    const my = rx * Math.sin(T) + ry * Math.cos(T)
    return slot.animate(
      [
        { transform: 'translate3d(0,0,0) rotateY(0deg)' },
        { transform: `translate3d(${mx * 0.45}px, ${my * 0.45}px, -60px) rotateY(22deg)` },
        { transform: 'translate3d(0,0,0) rotateY(0deg)' },
      ],
      { duration: 520, delay: i * 55, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' },
    )
  })
  return sprzataczka(animacje)
}

/**
 * Elektron: kratki zlatują do środka rzędu i kurczą się w jeden punkt.
 *
 * FLIP — mierzymy, gdzie każda kratka jest teraz, i przesuwamy ją do środka.
 * Skrajne ruszają pierwsze, więc rząd zwija się od zewnątrz, a nie naraz.
 */
export function elektron(sloty: HTMLElement[], rzad: HTMLElement): Sprzatanie {
  const hub = srodek(rzad)
  const srodkowy = (sloty.length - 1) / 2
  const animacje = sloty.map((slot, i) => {
    const s = srodek(slot)
    const dx = hub.x - s.x
    const odSrodka = Math.abs(i - srodkowy)
    const opoznienie = (srodkowy - odSrodka) * 70
    return slot.animate(
      [{ transform: 'none' }, { transform: `translate(${dx}px) scale(.34)`, opacity: 0.35 }],
      { duration: 640, delay: opoznienie, easing: 'cubic-bezier(.5,0,.1,1)', fill: 'both' },
    )
  })
  return sprzataczka(animacje)
}

export const ANIMACJE = { orbita, obwod, elektron } as const
