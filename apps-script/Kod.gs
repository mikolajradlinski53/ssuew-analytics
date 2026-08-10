/**
 * ============================================================
 *  DECK — warstwa danych na Arkuszach Google
 *  Web App wystawiajacy zakladki arkusza jako JSON.
 *
 *  Wolany WYLACZNIE przez trasy /api/* aplikacji DECK.
 *  Nigdy z przegladarki — token nie moze trafic do kodu strony.
 *
 *  Pierwsze uruchomienie:
 *    1. Uruchom funkcje `setup` (tworzy zakladki i wgrywa historie).
 *    2. Uruchom `pokazToken` i skopiuj wypisany token.
 *    3. Wdroz jako aplikacje internetowa:
 *         Wykonuj jako:  Ja
 *         Dostep:        Wszyscy
 *    4. Adres wdrozenia + token wpisz w zmienne srodowiskowe Vercela
 *       jako GAS_URL i GAS_TOKEN.
 * ============================================================
 */

/* ─── Schemat ────────────────────────────────────────────────
 * Kolejnosc kluczy = kolejnosc kolumn w arkuszu.
 * Typ decyduje, jak wartosc z komorki zamienia sie na JSON —
 * bez tego arkusz zwracalby liczby jako tekst, a puste komorki
 * jako pusty string zamiast zera.
 * `sort` odwzorowuje ORDER BY z poprzedniej bazy, zeby moduly
 * dostawaly dane w tej samej kolejnosci co dotad.
 */
const SCHEMAT = {
  rekrutacje: {
    kolumny: {
      id: 'text',
      edycja: 'text',
      sezon: 'text',
      rok: 'number',
      zgloszenia: 'number',
      przyjeci: 'number',
      created_at: 'text'
    },
    sort: ['rok', 'sezon'],
    kluczNaturalny: 'edycja'
  },
  kohorty: {
    kolumny: {
      id: 'text',
      edycja: 'text',
      sezon: 'text',
      rok: 'number',
      n_czlonkow: 'number',
      avg_retention_sem: 'number',
      max_retention_sem: 'number',
      in_progress: 'boolean',
      survival: 'numbers',
      created_at: 'text'
    },
    sort: ['rok', 'sezon'],
    kluczNaturalny: 'edycja'
  },
  kpi: {
    kolumny: {
      id: 'text',
      kategoria: 'text',
      nazwa: 'text',
      okres_poprzedni: 'text',
      wartosc_poprzednia: 'number',
      okres_biezacy: 'text',
      wartosc_biezaca: 'number',
      created_at: 'text'
    },
    sort: ['kategoria', 'nazwa'],
    kluczNaturalny: null
  },
  czlonkowie: {
    kolumny: {
      id: 'text',
      kohorta_edycja: 'text',
      imie_nazwisko: 'text',
      status: 'text',
      aktywnosc: 'numbers',
      created_at: 'text'
    },
    sort: ['kohorta_edycja', 'imie_nazwisko'],
    kluczNaturalny: null
  },
  // Kody dostepu dla osob bez konta z haslem.
  // `urzadzenie` jest puste do pierwszego uzycia — wtedy kod wiaze sie z ta
  // przegladarka i od tej pory tylko ona nim wejdzie. `ip_pierwszy` sluzy
  // wylacznie do wgladu, kto skad wchodzil; niczego nie blokuje, bo sieci
  // komorkowe zmieniaja adres przy kazdym polaczeniu.
  kody: {
    kolumny: {
      id: 'text',
      kod: 'text',
      etykieta: 'text',
      rola: 'text',
      urzadzenie: 'text',
      ip_pierwszy: 'text',
      ostatnie_uzycie: 'text',
      aktywny: 'boolean',
      created_at: 'text'
    },
    sort: ['etykieta'],
    kluczNaturalny: 'kod'
  }
};

/* ─── Punkty wejscia ─────────────────────────────────────── */

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    sprawdzToken(p.token);

    if (p.t === '_ping') {
      return json({ ok: true, zakladki: Object.keys(SCHEMAT), czas: teraz() });
    }

    const tabela = wezSchemat(p.t);
    return json(czytaj(p.t, tabela));
  } catch (err) {
    return blad(err);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    sprawdzToken(body.token);

    const tabela = wezSchemat(body.t);
    const op = body.op;
    const wiersze = Array.isArray(body.rows) ? body.rows : (body.row ? [body.row] : []);

    if (!wiersze.length) throw new Odmowa(400, 'Brak wierszy do zapisu');
    if (wiersze.length > 500) throw new Odmowa(400, 'Za duzo wierszy naraz (limit 500)');

    // Blokada na czas zapisu: bez niej dwa rownoczesne zapisy
    // moglyby trafic w ten sam wiersz albo zgubic jeden z nich.
    if (!lock.tryLock(20000)) throw new Odmowa(503, 'Arkusz zajety, sprobuj ponownie');

    let wynik;
    if (op === 'insert') {
      wynik = wstaw(body.t, tabela, wiersze);
    } else if (op === 'upsert') {
      wynik = nadpisz(body.t, tabela, wiersze);
    } else if (op === 'update') {
      wynik = popraw(body.t, tabela, wiersze);
    } else {
      throw new Odmowa(400, 'Nieznana operacja: ' + op);
    }

    return json({ ok: true, rows: wynik });
  } catch (err) {
    return blad(err);
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/* ─── Autoryzacja ────────────────────────────────────────── */

/**
 * Wdrozenie ma dostep "Wszyscy", wiec adres jest pierwszym sekretem,
 * a token drugim zamkiem. Porownanie przechodzi przez wszystkie znaki
 * niezaleznie od tego, gdzie wystapi roznica — zeby czas odpowiedzi
 * nie zdradzal, ile poczatkowych znakow zgadl pytajacy.
 */
function sprawdzToken(podany) {
  const oczekiwany = PropertiesService.getScriptProperties().getProperty('DECK_TOKEN');
  if (!oczekiwany) throw new Odmowa(500, 'Token nie jest ustawiony — uruchom setup()');
  if (typeof podany !== 'string' || podany.length !== oczekiwany.length) {
    throw new Odmowa(403, 'Brak dostepu');
  }
  let roznica = 0;
  for (let i = 0; i < oczekiwany.length; i++) {
    roznica |= podany.charCodeAt(i) ^ oczekiwany.charCodeAt(i);
  }
  if (roznica !== 0) throw new Odmowa(403, 'Brak dostepu');
}

function wezSchemat(nazwa) {
  const s = SCHEMAT[nazwa];
  if (!s) throw new Odmowa(400, 'Nieznana zakladka');
  return s;
}

/* ─── Odczyt ─────────────────────────────────────────────── */

function czytaj(nazwa, tabela) {
  const ark = arkusz(nazwa);
  const dane = ark.getDataRange().getValues();
  if (dane.length < 2) return [];

  const naglowki = dane[0].map(function (h) { return String(h).trim(); });
  sprawdzNaglowki(nazwa, tabela, naglowki);

  const klucze = Object.keys(tabela.kolumny);
  const wiersze = [];

  for (let i = 1; i < dane.length; i++) {
    const surowy = dane[i];
    // Wiersz bez identyfikatora i bez tresci to pusty wiersz na koncu arkusza.
    if (surowy.every(function (c) { return c === '' || c === null; })) continue;

    const obiekt = {};
    for (let k = 0; k < klucze.length; k++) {
      const kolumna = klucze[k];
      const idx = naglowki.indexOf(kolumna);
      obiekt[kolumna] = zamien(idx === -1 ? '' : surowy[idx], tabela.kolumny[kolumna]);
    }
    wiersze.push(obiekt);
  }

  return sortuj(wiersze, tabela.sort);
}

/**
 * Brakujacy naglowek to blad jawny, nie ciche zero. Gdyby ktos usunal
 * kolumne w arkuszu, moduly dostawalyby zera i wykresy wygladalyby
 * wiarygodnie, a bylyby falszywe — to gorsze niz widoczna awaria.
 */
function sprawdzNaglowki(nazwa, tabela, naglowki) {
  const brakujace = Object.keys(tabela.kolumny).filter(function (k) {
    return naglowki.indexOf(k) === -1;
  });
  if (brakujace.length) {
    throw new Odmowa(500, 'Zakladka "' + nazwa + '" nie ma kolumn: ' + brakujace.join(', '));
  }
}

function zamien(wartosc, typ) {
  if (typ === 'number') {
    if (wartosc === '' || wartosc === null) return 0;
    const n = typeof wartosc === 'number' ? wartosc : Number(String(wartosc).replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  if (typ === 'boolean') {
    if (typeof wartosc === 'boolean') return wartosc;
    const t = String(wartosc).trim().toUpperCase();
    return t === 'TRUE' || t === 'PRAWDA' || t === '1' || t === 'TAK';
  }
  if (typ === 'numbers') {
    if (wartosc === '' || wartosc === null) return [];
    return String(wartosc)
      .split(',')
      .map(function (x) { return Number(String(x).trim().replace(',', '.')); })
      .filter(function (x) { return !isNaN(x); });
  }
  if (wartosc instanceof Date) return wartosc.toISOString();
  return wartosc === null ? '' : String(wartosc);
}

function sortuj(wiersze, klucze) {
  return wiersze.sort(function (a, b) {
    for (let i = 0; i < klucze.length; i++) {
      const k = klucze[i];
      const x = a[k];
      const y = b[k];
      if (x === y) continue;
      if (typeof x === 'number' && typeof y === 'number') return x - y;
      return String(x).localeCompare(String(y), 'pl');
    }
    return 0;
  });
}

/* ─── Zapis ──────────────────────────────────────────────── */

function wstaw(nazwa, tabela, wiersze) {
  const ark = arkusz(nazwa);
  const klucze = Object.keys(tabela.kolumny);
  const zapisane = [];
  const doDopisania = [];

  for (let i = 0; i < wiersze.length; i++) {
    const pelny = uzupelnij(wiersze[i], tabela);
    zapisane.push(pelny);
    doDopisania.push(klucze.map(function (k) { return naKomorke(pelny[k], tabela.kolumny[k]); }));
  }

  ark.getRange(ark.getLastRow() + 1, 1, doDopisania.length, klucze.length).setValues(doDopisania);
  return zapisane;
}

/**
 * Nadpisuje wiersz o podanym `id`, a gdy `id` brak — wiersz o tej samej
 * wartosci klucza naturalnego (np. tej samej edycji rekrutacji).
 * Gdy nic nie pasuje, dopisuje nowy wiersz.
 */
function nadpisz(nazwa, tabela, wiersze) {
  const ark = arkusz(nazwa);
  const dane = ark.getDataRange().getValues();
  const naglowki = dane[0].map(function (h) { return String(h).trim(); });
  sprawdzNaglowki(nazwa, tabela, naglowki);

  const klucze = Object.keys(tabela.kolumny);
  const kolId = naglowki.indexOf('id');
  const kolKlucz = tabela.kluczNaturalny ? naglowki.indexOf(tabela.kluczNaturalny) : -1;
  const zapisane = [];
  const doDopisania = [];

  for (let i = 0; i < wiersze.length; i++) {
    const wchodzacy = wiersze[i];
    let nrWiersza = -1;

    if (wchodzacy.id) {
      nrWiersza = szukaj(dane, kolId, wchodzacy.id);
    } else if (kolKlucz !== -1 && wchodzacy[tabela.kluczNaturalny] != null) {
      nrWiersza = szukaj(dane, kolKlucz, wchodzacy[tabela.kluczNaturalny]);
    }

    if (nrWiersza === -1) {
      const nowy = uzupelnij(wchodzacy, tabela);
      zapisane.push(nowy);
      doDopisania.push(klucze.map(function (k) { return naKomorke(nowy[k], tabela.kolumny[k]); }));
      continue;
    }

    // Istniejacy wiersz: pola nieprzeslane zostaja bez zmian.
    const scalony = {};
    for (let k = 0; k < klucze.length; k++) {
      const kol = klucze[k];
      const idx = naglowki.indexOf(kol);
      scalony[kol] = wchodzacy[kol] !== undefined
        ? wchodzacy[kol]
        : zamien(dane[nrWiersza][idx], tabela.kolumny[kol]);
    }
    ark.getRange(nrWiersza + 1, 1, 1, klucze.length)
       .setValues([klucze.map(function (k) { return naKomorke(scalony[k], tabela.kolumny[k]); })]);
    zapisane.push(scalony);
  }

  if (doDopisania.length) {
    ark.getRange(ark.getLastRow() + 1, 1, doDopisania.length, klucze.length).setValues(doDopisania);
  }
  return zapisane;
}

/** Poprawka istniejacego wiersza. Wymaga `id`; nie tworzy nowych wierszy. */
function popraw(nazwa, tabela, wiersze) {
  const ark = arkusz(nazwa);
  const dane = ark.getDataRange().getValues();
  const naglowki = dane[0].map(function (h) { return String(h).trim(); });
  sprawdzNaglowki(nazwa, tabela, naglowki);

  const klucze = Object.keys(tabela.kolumny);
  const kolId = naglowki.indexOf('id');
  const zapisane = [];

  for (let i = 0; i < wiersze.length; i++) {
    const wchodzacy = wiersze[i];
    if (!wchodzacy.id) throw new Odmowa(400, 'Poprawka wymaga pola id');

    const nrWiersza = szukaj(dane, kolId, wchodzacy.id);
    if (nrWiersza === -1) throw new Odmowa(404, 'Nie ma wiersza o id ' + wchodzacy.id);

    const scalony = {};
    for (let k = 0; k < klucze.length; k++) {
      const kol = klucze[k];
      const idx = naglowki.indexOf(kol);
      scalony[kol] = (wchodzacy[kol] !== undefined && kol !== 'id' && kol !== 'created_at')
        ? wchodzacy[kol]
        : zamien(dane[nrWiersza][idx], tabela.kolumny[kol]);
    }
    ark.getRange(nrWiersza + 1, 1, 1, klucze.length)
       .setValues([klucze.map(function (k) { return naKomorke(scalony[k], tabela.kolumny[k]); })]);
    zapisane.push(scalony);
  }

  return zapisane;
}

function szukaj(dane, kolumna, wartosc) {
  if (kolumna === -1) return -1;
  const szukane = String(wartosc).trim();
  for (let i = 1; i < dane.length; i++) {
    if (String(dane[i][kolumna]).trim() === szukane) return i;
  }
  return -1;
}

/** Uzupelnia identyfikator i date utworzenia, gdy wiersz ich nie ma. */
function uzupelnij(wiersz, tabela) {
  const pelny = {};
  const klucze = Object.keys(tabela.kolumny);
  for (let i = 0; i < klucze.length; i++) {
    const k = klucze[i];
    pelny[k] = wiersz[k] !== undefined ? wiersz[k] : domyslna(tabela.kolumny[k]);
  }
  if (!pelny.id) pelny.id = Utilities.getUuid();
  if (!pelny.created_at) pelny.created_at = teraz();
  return pelny;
}

function domyslna(typ) {
  if (typ === 'number') return 0;
  if (typ === 'boolean') return false;
  if (typ === 'numbers') return [];
  return '';
}

/** Tablice liczb ida do komorki jako "100,90,72" — arkusz ma byc czytelny dla czlowieka. */
function naKomorke(wartosc, typ) {
  if (typ === 'numbers') return Array.isArray(wartosc) ? wartosc.join(',') : String(wartosc || '');
  if (typ === 'boolean') return wartosc === true;
  if (typ === 'number') return typeof wartosc === 'number' ? wartosc : Number(wartosc) || 0;
  return wartosc === null || wartosc === undefined ? '' : String(wartosc);
}

/* ─── Odpowiedzi ─────────────────────────────────────────── */

function Odmowa(kod, wiadomosc) {
  this.kod = kod;
  this.wiadomosc = wiadomosc;
}

function json(obiekt) {
  return ContentService
    .createTextOutput(JSON.stringify(obiekt))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Skrypt nie moze ustawic kodu HTTP — Apps Script zawsze odpowiada 200.
 * Dlatego kod bledu jedzie w tresci, a klient po stronie DECK go odczytuje.
 * Bledy autoryzacji nie zdradzaja, co dokladnie bylo nie tak.
 */
function blad(err) {
  if (err instanceof Odmowa) {
    return json({ ok: false, kod: err.kod, error: err.wiadomosc });
  }
  console.error(err);
  return json({ ok: false, kod: 500, error: 'Blad skryptu: ' + (err && err.message ? err.message : err) });
}

function arkusz(nazwa) {
  const ark = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nazwa);
  if (!ark) throw new Odmowa(500, 'Brak zakladki "' + nazwa + '" — uruchom setup()');
  return ark;
}

function teraz() {
  return new Date().toISOString();
}

/* ─── Pierwsze uruchomienie ──────────────────────────────── */

/**
 * Tworzy cztery zakladki z naglowkami, wgrywa dane historyczne SSUEW
 * i generuje token. Uruchomiona ponownie nie nadpisuje istniejacych
 * danych — dopisuje tylko brakujace zakladki.
 */
function setup() {
  const plik = SpreadsheetApp.getActiveSpreadsheet();
  const wlasciwosci = PropertiesService.getScriptProperties();

  Object.keys(SCHEMAT).forEach(function (nazwa) {
    let ark = plik.getSheetByName(nazwa);
    if (ark) {
      Logger.log('Zakladka "' + nazwa + '" juz istnieje — pomijam.');
      return;
    }
    ark = plik.insertSheet(nazwa);
    const klucze = Object.keys(SCHEMAT[nazwa].kolumny);

    ark.getRange(1, 1, 1, klucze.length).setValues([klucze])
       .setFontWeight('bold')
       .setBackground('#10141B')
       .setFontColor('#E6EDF3');
    ark.setFrozenRows(1);

    const nasiona = SEED[nazwa] || [];
    if (nasiona.length) {
      const tabela = SCHEMAT[nazwa];
      const wiersze = nasiona.map(function (n) {
        const pelny = uzupelnij(n, tabela);
        return klucze.map(function (k) { return naKomorke(pelny[k], tabela.kolumny[k]); });
      });
      ark.getRange(2, 1, wiersze.length, klucze.length).setValues(wiersze);
    }
    ark.autoResizeColumns(1, klucze.length);
    Logger.log('Utworzono zakladke "' + nazwa + '" (' + nasiona.length + ' wierszy).');
  });

  // Domyslny pusty arkusz z nowego pliku tylko przeszkadza.
  const pusty = plik.getSheetByName('Arkusz1') || plik.getSheetByName('Sheet1');
  if (pusty && plik.getSheets().length > 1 && pusty.getLastRow() === 0) {
    plik.deleteSheet(pusty);
  }

  if (!wlasciwosci.getProperty('DECK_TOKEN')) {
    wlasciwosci.setProperty('DECK_TOKEN', Utilities.getUuid() + Utilities.getUuid().replace(/-/g, ''));
    Logger.log('Wygenerowano nowy token.');
  }
  Logger.log('Gotowe. Uruchom pokazToken(), zeby go odczytac.');
}

/** Wypisuje token do dziennika — stad kopiujesz go do zmiennych Vercela. */
function pokazToken() {
  const t = PropertiesService.getScriptProperties().getProperty('DECK_TOKEN');
  Logger.log(t ? 'GAS_TOKEN=' + t : 'Brak tokenu — uruchom najpierw setup().');
}

/** Unowaznia stary token i wystawia nowy. Po uruchomieniu zaktualizuj GAS_TOKEN na Vercelu. */
function zmienToken() {
  const nowy = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('DECK_TOKEN', nowy);
  Logger.log('GAS_TOKEN=' + nowy);
}

/* ─── Dane historyczne SSUEW ─────────────────────────────────
 * Zrodlo: dane_zrodlowe/KPI SSUEW.xlsx oraz
 * dane_zrodlowe/Analiza - dlugosc dzialania wzgledem rekrutacji.xlsx
 * Te same liczby, ktore dotad byly w lib/schema.sql.
 * Zakladka `czlonkowie` startuje pusta — nazwiska nie sa w repozytorium.
 */
const SEED = {
  rekrutacje: [
    { edycja: "J'23", sezon: 'jesien', rok: 2023, zgloszenia: 100, przyjeci: 38 },
    { edycja: "W'24", sezon: 'wiosna', rok: 2024, zgloszenia: 28,  przyjeci: 13 },
    { edycja: "J'24", sezon: 'jesien', rok: 2024, zgloszenia: 149, przyjeci: 38 },
    { edycja: "W'25", sezon: 'wiosna', rok: 2025, zgloszenia: 31,  przyjeci: 10 },
    { edycja: "J'25", sezon: 'jesien', rok: 2025, zgloszenia: 138, przyjeci: 45 },
    { edycja: "W'26", sezon: 'wiosna', rok: 2026, zgloszenia: 18,  przyjeci: 11 }
  ],

  kohorty: [
    { edycja: "W'22", sezon: 'wiosna', rok: 2022, n_czlonkow: 14, avg_retention_sem: 4.36, max_retention_sem: 9, in_progress: false, survival: [100,100,100,100,73,36,9,9,9] },
    { edycja: "J'22", sezon: 'jesien', rok: 2022, n_czlonkow: 39, avg_retention_sem: 4.24, max_retention_sem: 8, in_progress: false, survival: [100,100,100,85,73,33,18,9,6] },
    { edycja: "W'23", sezon: 'wiosna', rok: 2023, n_czlonkow: 11, avg_retention_sem: 4.20, max_retention_sem: 7, in_progress: false, survival: [100,100,90,90,60,30,30,20] },
    { edycja: "J'23", sezon: 'jesien', rok: 2023, n_czlonkow: 39, avg_retention_sem: 3.86, max_retention_sem: 6, in_progress: false, survival: [100,100,97,83,63,31,11] },
    { edycja: "W'24", sezon: 'wiosna', rok: 2024, n_czlonkow: 13, avg_retention_sem: 2.69, max_retention_sem: 5, in_progress: false, survival: [100,100,77,69,23] },
    { edycja: "J'24", sezon: 'jesien', rok: 2024, n_czlonkow: 38, avg_retention_sem: 3.53, max_retention_sem: 4, in_progress: false, survival: [100,100,100,80,73] },
    { edycja: "W'25", sezon: 'wiosna', rok: 2025, n_czlonkow: 10, avg_retention_sem: 1.80, max_retention_sem: 3, in_progress: true,  survival: [100,60,60,60] }
  ],

  kpi: [
    { kategoria: 'SKS', nazwa: 'Pazdziernik', okres_poprzedni: '2024/2025', wartosc_poprzednia: 48, okres_biezacy: '2025/2026', wartosc_biezaca: 45 },
    { kategoria: 'SKS', nazwa: 'Listopad',    okres_poprzedni: '2024/2025', wartosc_poprzednia: 57, okres_biezacy: '2025/2026', wartosc_biezaca: 84 },
    { kategoria: 'SKS', nazwa: 'Grudzien',    okres_poprzedni: '2024/2025', wartosc_poprzednia: 43, okres_biezacy: '2025/2026', wartosc_biezaca: 56 },
    { kategoria: 'SKS', nazwa: 'Styczen',     okres_poprzedni: '2024/2025', wartosc_poprzednia: 41, okres_biezacy: '2025/2026', wartosc_biezaca: 56 },
    { kategoria: 'SKS', nazwa: 'Luty',        okres_poprzedni: '2024/2025', wartosc_poprzednia: 34, okres_biezacy: '2025/2026', wartosc_biezaca: 44 },
    { kategoria: 'SKS', nazwa: 'Marzec',      okres_poprzedni: '2024/2025', wartosc_poprzednia: 42, okres_biezacy: '2025/2026', wartosc_biezaca: 47 },

    { kategoria: 'Wydarzenia', nazwa: 'JWK',         okres_poprzedni: '2024/2025', wartosc_poprzednia: 43, okres_biezacy: '2025/2026', wartosc_biezaca: 52 },
    { kategoria: 'Wydarzenia', nazwa: 'Wigilia',     okres_poprzedni: '2024/2025', wartosc_poprzednia: 83, okres_biezacy: '2025/2026', wartosc_biezaca: 77 },
    { kategoria: 'Wydarzenia', nazwa: 'Przydzialki', okres_poprzedni: '2024/2025', wartosc_poprzednia: 56, okres_biezacy: '2025/2026', wartosc_biezaca: 64 },
    { kategoria: 'Wydarzenia', nazwa: 'WWK',         okres_poprzedni: '2024/2025', wartosc_poprzednia: 45, okres_biezacy: '2025/2026', wartosc_biezaca: 40 },

    { kategoria: 'Ankieta', nazwa: 'Zimowa Zarzadu', okres_poprzedni: '2024/2025', wartosc_poprzednia: 47, okres_biezacy: '2025/2026', wartosc_biezaca: 28 },

    { kategoria: 'Koordynatorzy', nazwa: 'DA',          okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'RJ',          okres_poprzedni: '2024/2025', wartosc_poprzednia: 2, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'JWK',         okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 2 },
    { kategoria: 'Koordynatorzy', nazwa: 'TWE',         okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 2 },
    { kategoria: 'Koordynatorzy', nazwa: 'ZFUE',        okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'Bal',         okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'ME',          okres_poprzedni: '2024/2025', wartosc_poprzednia: 2, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'Wigilia',     okres_poprzedni: '2024/2025', wartosc_poprzednia: 9, okres_biezacy: '2025/2026', wartosc_biezaca: 12 },
    { kategoria: 'Koordynatorzy', nazwa: 'TEDx',        okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'Przydzialki', okres_poprzedni: '2024/2025', wartosc_poprzednia: 2, okres_biezacy: '2025/2026', wartosc_biezaca: 2 },
    { kategoria: 'Koordynatorzy', nazwa: 'WWK',         okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'RW',          okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'Adapciak',    okres_poprzedni: '2024/2025', wartosc_poprzednia: 2, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'Animalia',    okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 2 },
    { kategoria: 'Koordynatorzy', nazwa: 'LWK',         okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 1 },
    { kategoria: 'Koordynatorzy', nazwa: 'Gala',        okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 5 },
    { kategoria: 'Koordynatorzy', nazwa: 'Graduation',  okres_poprzedni: '2024/2025', wartosc_poprzednia: 1, okres_biezacy: '2025/2026', wartosc_biezaca: 2 }
  ],

  czlonkowie: [],

  // Jeden kod na start, zebys mial czym sprawdzic dzialanie. Zmien go
  // albo skasuj wiersz, gdy wygenerujesz wlasne z poziomu kokpitu.
  kody: [
    { kod: 'DECK-START', etykieta: 'kod probny', rola: 'board', aktywny: true }
  ]
};
