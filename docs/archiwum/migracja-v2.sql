-- ============================================================
-- SSUEW Analytics — Migracja v2 (uruchom w Supabase SQL Editor)
-- Dodaje TYLKO nowe obiekty (kohorty.survival, kpi_metrics, czlonkowie).
-- Idempotentna — można uruchomić ponownie bez błędów "already exists".
-- ============================================================

-- ─── 1. Kolumna krzywej przeżycia na istniejącej tabeli kohorty ───
alter table kohorty add column if not exists survival numeric[];

-- ─── 2. KPI rok-do-roku ───
create table if not exists kpi_metrics (
  id                  uuid primary key default gen_random_uuid(),
  kategoria           text not null,
  nazwa               text not null,
  okres_poprzedni     text not null,
  wartosc_poprzednia  numeric not null,
  okres_biezacy       text not null,
  wartosc_biezaca     numeric not null,
  created_at          timestamptz default now()
);
alter table kpi_metrics enable row level security;
drop policy if exists "public read kpi_metrics" on kpi_metrics;
create policy "public read kpi_metrics" on kpi_metrics for select using (true);
drop policy if exists "auth insert kpi_metrics" on kpi_metrics;
create policy "auth insert kpi_metrics" on kpi_metrics for insert with check (auth.role() = 'authenticated');

-- ─── 3. Członkowie (DANE OSOBOWE — tylko Twoja baza) ───
create table if not exists czlonkowie (
  id              uuid primary key default gen_random_uuid(),
  kohorta_edycja  text not null,
  imie_nazwisko   text not null,
  status          text not null default 'aktywny'
                    check (status in ('aktywny','wspierający','alumn','zawieszone','nieaktywny')),
  aktywnosc       int[] default '{}',
  created_at      timestamptz default now()
);
alter table czlonkowie enable row level security;
-- Odczyt tylko dla zalogowanych (dane osobowe — nie publiczne).
drop policy if exists "public read czlonkowie" on czlonkowie;
drop policy if exists "auth read czlonkowie" on czlonkowie;
create policy "auth read czlonkowie" on czlonkowie for select using (auth.role() = 'authenticated');
drop policy if exists "auth insert czlonkowie" on czlonkowie;
create policy "auth insert czlonkowie" on czlonkowie for insert with check (auth.role() = 'authenticated');
drop policy if exists "auth update czlonkowie" on czlonkowie;
create policy "auth update czlonkowie" on czlonkowie for update using (auth.role() = 'authenticated');

-- ============================================================
-- DANE (opcjonalnie). Uruchom JEDNORAZOWO.
-- ============================================================

-- 4. Realne krzywe przeżycia dla istniejących kohort (UPDATE — nie psuje innych pól)
update kohorty set survival='{100,100,100,100,73,36,9,9,9}' where edycja='W''22';
update kohorty set survival='{100,100,100,85,73,33,18,9,6}'  where edycja='J''22';
update kohorty set survival='{100,100,90,90,60,30,30,20}'    where edycja='W''23';
update kohorty set survival='{100,100,97,83,63,31,11}'       where edycja='J''23';
update kohorty set survival='{100,100,77,69,23}'             where edycja='W''24';
update kohorty set survival='{100,100,100,80,73}'            where edycja='J''24';
update kohorty set survival='{100,60,60,60}'                 where edycja='W''25';

-- 5. Realne KPI (idempotentnie — ponowne uruchomienie nie doda duplikatów)
with seed(kategoria, nazwa, okres_poprzedni, wartosc_poprzednia, okres_biezacy, wartosc_biezaca) as (
  values
    ('SKS', 'Październik', '2024/2025', 48::numeric, '2025/2026', 45::numeric),
    ('SKS', 'Listopad',    '2024/2025', 57::numeric, '2025/2026', 84::numeric),
    ('SKS', 'Grudzień',    '2024/2025', 43::numeric, '2025/2026', 56::numeric),
    ('SKS', 'Styczeń',     '2024/2025', 41::numeric, '2025/2026', 56::numeric),
    ('SKS', 'Luty',        '2024/2025', 34::numeric, '2025/2026', 44::numeric),
    ('SKS', 'Marzec',      '2024/2025', 42::numeric, '2025/2026', 47::numeric),
    ('Wydarzenia', 'JWK',         '2024/2025', 43::numeric, '2025/2026', 52::numeric),
    ('Wydarzenia', 'Wigilia',     '2024/2025', 83::numeric, '2025/2026', 77::numeric),
    ('Wydarzenia', 'Przydziałki', '2024/2025', 56::numeric, '2025/2026', 64::numeric),
    ('Wydarzenia', 'WWK',         '2024/2025', 45::numeric, '2025/2026', 40::numeric),
    ('Ankieta', 'Zimowa Zarządu', '2024/2025', 47::numeric, '2025/2026', 28::numeric),
    ('Koordynatorzy', 'DA',         '2024/2025', 1::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'RJ',         '2024/2025', 2::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'JWK',        '2024/2025', 1::numeric, '2025/2026', 2::numeric),
    ('Koordynatorzy', 'TWE',        '2024/2025', 1::numeric, '2025/2026', 2::numeric),
    ('Koordynatorzy', 'ZFUE',       '2024/2025', 1::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'Bal',        '2024/2025', 1::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'ME',         '2024/2025', 2::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'Wigilia',    '2024/2025', 9::numeric, '2025/2026', 12::numeric),
    ('Koordynatorzy', 'TEDx',       '2024/2025', 1::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'Przydziałki','2024/2025', 2::numeric, '2025/2026', 2::numeric),
    ('Koordynatorzy', 'WWK',        '2024/2025', 1::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'RW',         '2024/2025', 1::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'Adapciak',   '2024/2025', 2::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'Animalia',   '2024/2025', 1::numeric, '2025/2026', 2::numeric),
    ('Koordynatorzy', 'LWK',        '2024/2025', 1::numeric, '2025/2026', 1::numeric),
    ('Koordynatorzy', 'Gala',       '2024/2025', 1::numeric, '2025/2026', 5::numeric),
    ('Koordynatorzy', 'Graduation', '2024/2025', 1::numeric, '2025/2026', 2::numeric)
)
insert into kpi_metrics (kategoria, nazwa, okres_poprzedni, wartosc_poprzednia, okres_biezacy, wartosc_biezaca)
select seed.*
from seed
where not exists (
  select 1
  from kpi_metrics existing
  where existing.kategoria = seed.kategoria
    and existing.nazwa = seed.nazwa
    and existing.okres_poprzedni = seed.okres_poprzedni
    and existing.okres_biezacy = seed.okres_biezacy
);
