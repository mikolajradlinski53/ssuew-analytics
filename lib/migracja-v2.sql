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
drop policy if exists "public read czlonkowie" on czlonkowie;
create policy "public read czlonkowie" on czlonkowie for select using (true);
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

-- 5. Realne KPI (uruchom RAZ — brak deduplikacji; nie odpalaj wielokrotnie)
insert into kpi_metrics (kategoria, nazwa, okres_poprzedni, wartosc_poprzednia, okres_biezacy, wartosc_biezaca) values
  ('SKS', 'Październik', '2024/2025', 48, '2025/2026', 45),
  ('SKS', 'Listopad',    '2024/2025', 57, '2025/2026', 84),
  ('SKS', 'Grudzień',    '2024/2025', 43, '2025/2026', 56),
  ('SKS', 'Styczeń',     '2024/2025', 41, '2025/2026', 56),
  ('SKS', 'Luty',        '2024/2025', 34, '2025/2026', 44),
  ('SKS', 'Marzec',      '2024/2025', 42, '2025/2026', 47),
  ('Wydarzenia', 'JWK',         '2024/2025', 43, '2025/2026', 52),
  ('Wydarzenia', 'Wigilia',     '2024/2025', 83, '2025/2026', 77),
  ('Wydarzenia', 'Przydziałki', '2024/2025', 56, '2025/2026', 64),
  ('Wydarzenia', 'WWK',         '2024/2025', 45, '2025/2026', 40),
  ('Ankieta', 'Zimowa Zarządu', '2024/2025', 47, '2025/2026', 28),
  ('Koordynatorzy', 'DA',         '2024/2025', 1, '2025/2026', 1),
  ('Koordynatorzy', 'RJ',         '2024/2025', 2, '2025/2026', 1),
  ('Koordynatorzy', 'JWK',        '2024/2025', 1, '2025/2026', 2),
  ('Koordynatorzy', 'TWE',        '2024/2025', 1, '2025/2026', 2),
  ('Koordynatorzy', 'ZFUE',       '2024/2025', 1, '2025/2026', 1),
  ('Koordynatorzy', 'Bal',        '2024/2025', 1, '2025/2026', 1),
  ('Koordynatorzy', 'ME',         '2024/2025', 2, '2025/2026', 1),
  ('Koordynatorzy', 'Wigilia',    '2024/2025', 9, '2025/2026', 12),
  ('Koordynatorzy', 'TEDx',       '2024/2025', 1, '2025/2026', 1),
  ('Koordynatorzy', 'Przydziałki','2024/2025', 2, '2025/2026', 2),
  ('Koordynatorzy', 'WWK',        '2024/2025', 1, '2025/2026', 1),
  ('Koordynatorzy', 'RW',         '2024/2025', 1, '2025/2026', 1),
  ('Koordynatorzy', 'Adapciak',   '2024/2025', 2, '2025/2026', 1),
  ('Koordynatorzy', 'Animalia',   '2024/2025', 1, '2025/2026', 2),
  ('Koordynatorzy', 'LWK',        '2024/2025', 1, '2025/2026', 1),
  ('Koordynatorzy', 'Gala',       '2024/2025', 1, '2025/2026', 5),
  ('Koordynatorzy', 'Graduation', '2024/2025', 1, '2025/2026', 2);
