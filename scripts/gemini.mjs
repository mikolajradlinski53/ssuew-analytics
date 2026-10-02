// Sprawdzenie klucza Gemini bez uruchamiania aplikacji.
//   npm run gemini -- modele   lista modeli, które umieją generateContent
//   npm run gemini -- proba    jedno zapytanie ze schematem JSON, z czasem odpowiedzi
import { existsSync, readFileSync } from 'node:fs'

if (existsSync('.env.local')) {
  for (const linia of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = linia.match(/^\s*(GEMINI_[A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const klucz = process.env.GEMINI_API_KEY
if (!klucz) {
  console.error('Brak GEMINI_API_KEY w .env.local - klucz założysz na https://aistudio.google.com/apikey')
  process.exit(1)
}
const ADRES = 'https://generativelanguage.googleapis.com/v1beta'
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
const [polecenie = 'proba'] = process.argv.slice(2)

if (polecenie === 'modele') {
  const res = await fetch(`${ADRES}/models?pageSize=200`, { headers: { 'x-goog-api-key': klucz } })
  const dane = await res.json()
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${dane.error?.message}`)
    process.exit(1)
  }
  for (const m of dane.models ?? []) {
    if (m.supportedGenerationMethods?.includes('generateContent')) console.log(`${m.name.replace('models/', '')}  (${m.displayName})`)
  }
} else if (polecenie === 'proba') {
  const start = Date.now()
  const res = await fetch(`${ADRES}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': klucz },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Podaj dwa ryzyka dla samorządu studenckiego przed rekrutacją.' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: { type: 'OBJECT', properties: { ryzyka: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['ryzyka'] },
      },
    }),
  })
  const dane = await res.json()
  console.log(`model ${model}: HTTP ${res.status} w ${Date.now() - start} ms`)
  console.log(res.ok ? dane.candidates?.[0]?.content?.parts?.[0]?.text : dane.error?.message)
  if (!res.ok) process.exit(1)
} else {
  console.error('Użycie: npm run gemini -- modele | proba')
  process.exit(1)
}
