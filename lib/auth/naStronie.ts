import { cookies } from 'next/headers'
import { ktoZCiasteczek, type Pytajacy } from './guard'

/** Strony serwerowe (kokpit, Planer): te same dwie drogi wejścia co trasy API. */
export async function ktoNaStronie(): Promise<Pytajacy | null> {
  const c = await cookies()
  return ktoZCiasteczek(c.get('deck_session')?.value, c.get('deck_kod')?.value)
}
