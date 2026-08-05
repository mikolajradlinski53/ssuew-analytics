export const GAS_URL = process.env.GAS_URL ?? ''
export const GAS_TOKEN = process.env.GAS_TOKEN ?? ''

/** Bez obu sekretów aplikacja działa na danych demonstracyjnych — tak jak dotąd bez Supabase. */
export const isConfigured = GAS_URL !== '' && GAS_TOKEN !== ''
