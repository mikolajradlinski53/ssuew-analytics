import '@testing-library/jest-dom/vitest'

// jsdom nie implementuje matchMedia, a komponenty pytają o prefers-reduced-motion.
// Bez tej zaślepki każdy z nich wysypuje się przy pierwszym renderze w teście.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((zapytanie: string) => ({
    matches: false,
    media: zapytanie,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
