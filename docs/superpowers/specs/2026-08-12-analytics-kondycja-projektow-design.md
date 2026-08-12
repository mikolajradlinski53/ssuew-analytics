# Analytics — kondycja projektów

**Data:** 2026-08-12
**Status:** projekt do zatwierdzenia

---

## 1. Cel

Zebrać w jednym miejscu wszystko, co mówi o kondycji projektu — budżet, nabór, zasięg,
partnerów i opisane problemy — tak, żeby **od razu było widać, który projekt się sypie**.

Moduł nie wystawia oceny liczbowej. Zamiast tego projekt zapala **flagi**: konkretne
zastrzeżenia z konkretnym powodem.

---

## 2. Dlaczego flagi, a nie wynik

Wynik złożony 0–100 wyglądałby mądrzej, ale byłby zmyślony. Sklejenie procentu budżetu
z liczbą partnerów wymaga wag, których nikt nie potrafi uzasadnić — a przy spadku
z 82 na 64 nie da się powiedzieć, co właściwie zawiniło.

Flaga mówi wprost: *budżet przekroczony o 40%*. Nie udaje precyzji, której w tych danych
nie ma, i od razu wskazuje, co naprawiać.

**Cena tej decyzji:** projektów nie da się ustawić w kolejność od najgorszego do najlepszego.
Nadrabiamy to sortowaniem po liczbie i wadze zapalonych flag — to nie ranking rentowności,
tylko kolejność „ile się świeci".

---

## 3. Model danych

Nowa zakładka arkusza **`projekty`**. Jeden wiersz to **jeden projekt w jednej edycji** —
ten sam wzorzec co `kpi_punkty`, więc dodanie roku to dopisanie wierszy.

| Kolumna | Typ | Znaczenie |
|---|---|---|
| `id` | tekst | nadawane przez skrypt |
| `projekt` | tekst | `Gala`, `Adapciak`, `TEDx` |
| `edycja` | tekst | `2025/2026` — ten sam format co w KPI |
| `obszar` | tekst | `Kultura`, `Sport`, `Edukacja` |
| `budzet_plan` | liczba | złotówki przyznane |
| `budzet_wydany` | liczba | złotówki wydane |
| `przedluzenia` | liczba | ile razy przedłużano nabór |
| `aplikujacy` | liczba | ile osób złożyło aplikację |
| `uczestnicy` | liczba | ile osób wzięło udział |
| `partnerzy_fin` | liczba | partnerzy finansowi |
| `partnerzy_barter` | liczba | partnerzy barterowi |
| `problemy` | tekst | wolny opis, co poszło nie tak |
| `created_at` | tekst | znacznik zapisu |

Projekt jest rozpoznawany po parze `(projekt, edycja)` — tak jak metryka KPI po
`(kategoria, nazwa)`. Zmiana nazwy projektu rozrywa jego historię.

---

## 4. Założenia — sprawdź je, bo na nich stoi reszta

1. **Projekt ma edycje.** Twoje „miejsce na problemy w danej edycji" zakłada, że ten sam
   projekt wraca co rok. Bez tego flagi porównawcze („mniej chętnych niż rok temu") nie mają
   z czym porównywać.
2. **Budżet w złotówkach, nie w procentach.** Trzymamy `plan` i `wydany` osobno, bo z dwóch
   liczb procent wyliczymy, a z procentu liczb już nie odzyskamy — i nie da się wtedy
   zsumować budżetu obszaru.
3. **Niewykorzystany budżet to też sygnał.** Przyjmuję, że projekt, który wydał 40% przyznanych
   pieniędzy, czegoś nie dowiózł — a nie że był oszczędny. **To założenie, nie fakt.**
   Jeśli u Was oszczędność jest cnotą, kasujemy tę flagę i nic innego się nie zmienia.
4. **Partnerzy liczą się osobno.** Finansowy i barterowy to różne rzeczy i sumowanie ich
   zacierałoby to, czego szukasz.

---

## 5. Flagi

Czysta funkcja: `flagiProjektu(biezaca: Projekt, poprzednia: Projekt | null): Flaga[]`

| Flaga | Warunek | Waga |
|---|---|---|
| Budżet przekroczony | `wydany > plan` | alarm |
| Budżet ledwo ruszony | `wydany < 0,6 × plan` | ostrzeżenie |
| Nabór przedłużany | `przedluzenia >= 2` | ostrzeżenie |
| Mniej chętnych niż rok temu | `aplikujacy < 0,8 × poprzedni` | ostrzeżenie |
| Mniej uczestników niż rok temu | `uczestnicy < 0,8 × poprzedni` | ostrzeżenie |
| Bez partnera finansowego | `partnerzy_fin === 0` | ostrzeżenie |
| Nabór ledwo obsadzony | `uczestnicy > 0 && aplikujacy <= uczestnicy` | ostrzeżenie |
| Opisane problemy | `problemy` niepuste | informacja |

Wszystkie progi (`0,6`, `0,8`, `2`) mieszkają w jednej stałej `PROGI` na górze pliku.
Zmiana progu to zmiana jednej liczby, nie polowanie po kodzie.

**Flagi porównawcze milkną przy pierwszej edycji** — brak poprzedniego roku znaczy „nie wiem",
a nie „bez zastrzeżeń". Nowy projekt nie może wyglądać na zdrowy tylko dlatego, że nie ma
z czym go zestawić.

**Każda flaga niesie własne uzasadnienie liczbowe** — nie samą etykietę. „Budżet przekroczony
o 40% (7 000 zł z 5 000 zł)", a nie „budżet przekroczony".

---

## 6. Widok

Kafelek na projekt, w kolejności: najpierw te z alarmem, potem z ostrzeżeniami, na końcu
czyste. W obrębie grupy — po liczbie flag malejąco.

```
Gala · Kultura · 2025/2026
  ALARM   Budżet przekroczony o 40% (7 000 zł z 5 000 zł)
  UWAGA   Nabór przedłużany 3 razy
  UWAGA   Mniej chętnych: 12 vs 31 rok temu
  INFO    Opisane problemy →

TEDx · Edukacja · 2025/2026
  UWAGA   Bez partnera finansowego (3 barterowych)

Adapciak · Integracja · 2025/2026
  bez zastrzeżeń
```

Projekty bez zastrzeżeń są **zwinięte do jednej linii** — zajmują miejsce proporcjonalne
do tego, ile uwagi wymagają.

**Przełącznik edycji** u góry, domyślnie najnowsza. Wskaźniki liczbowe (budżet, uczestnicy,
partnerzy) pokazujemy w kafelku obok flag, żeby nie trzeba było wchodzić w arkusz.

---

## 7. Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `types/index.ts` | `Projekt`, `Flaga`, `WagaFlagi` |
| `lib/projekty/flagi.ts` | Progi, `flagiProjektu`, `pogrupujPoEdycji`, sortowanie |
| `lib/projekty/flagi.test.ts` | Testy powyższego |
| `app/api/projekty/route.ts` | Odczyt i zapis przez Apps Script |
| `app/analytics/projekty/page.tsx` | Strona modułu |
| `components/modules/ProjektyClient.tsx` | Przełącznik edycji, kolejność, pustka |
| `components/modules/KartaProjektu.tsx` | Jeden projekt: liczby + flagi |
| `components/modules/WpisClient.tsx` | Nowa zakładka „Projekt" |
| `apps-script/Kod.gs` | Schemat `projekty` |
| `lib/gas/schema.ts` | Zakładka `projekty` |

---

## 8. Testy

| Co | Jak |
|---|---|
| `flagiProjektu` | Wydany 7000 przy planie 5000 → alarm z tekstem „o 40%". Wydany 2000 przy 5000 → ostrzeżenie o niewykorzystaniu. Dwa przedłużenia → ostrzeżenie, jedno → cisza. Aplikujący 12 vs 31 → ostrzeżenie; 12 vs 13 → cisza (próg 0,8). `partnerzy_fin === 0` przy trzech barterowych → ostrzeżenie. Pusty `problemy` → brak flagi informacyjnej. |
| Pierwsza edycja | `poprzednia === null` nie daje żadnej flagi porównawczej — ani ostrzeżenia, ani fałszywego spokoju. |
| Dzielenie przez zero | `plan === 0` nie daje `Infinity` w tekście flagi ani `NaN` w procencie. |
| Kolejność | Projekt z alarmem stoi przed projektem z trzema ostrzeżeniami. Projekt bez flag jest ostatni. |
| `KartaProjektu` | Projekt bez flag renderuje jedną linię, nie pustą listę. Flaga alarmowa dostaje klasę alarmu. |
| `ProjektyClient` | Przełączenie edycji zmienia zestaw kafelków. Brak danych daje komunikat, nie pustą stronę. |

---

## 9. Ryzyka

| Ryzyko | Waga | Co z tym robimy |
|---|---|---|
| Niepełne dane historyczne — flagi porównawcze milczą dla większości projektów | wysoka | Karta mówi wprost „brak danych z poprzedniej edycji", zamiast udawać, że wszystko gra |
| Założenie o niewykorzystanym budżecie jest błędne | średnia | Jedna flaga do skasowania, reszta modułu nietknięta |
| Zmiana nazwy projektu rozrywa historię | średnia | Ta sama cena co w KPI; opisane w `Kod.gs` przy schemacie |
| Trzynaście kolumn to dużo do wpisania na projekt | średnia | Formularz pozwala zapisać wiersz z częścią pól; brakujące liczby po prostu nie zapalają swoich flag |
| Projektów przybędzie i strona się wydłuży | niska | Czyste zwinięte do jednej linii; przełącznik edycji ogranicza widok do jednego roku |

---

## 10. Decyzje odłożone

- **Zestawienie obszarów** — suma budżetu i uczestników per obszar. Kuszące, ale najpierw
  chcę zobaczyć, czy `obszar` jest wypełniany konsekwentnie.
- **Trend projektu przez lata** — wykres jak w KPI. Ma sens dopiero przy trzech edycjach.
- **Powiązanie z rekrutacją do projektu z modułu KPI** — te same liczby mogą trafić w dwa
  miejsca. Do rozstrzygnięcia, gdy zobaczymy, czy wpisywanie ich dwa razy realnie przeszkadza.
