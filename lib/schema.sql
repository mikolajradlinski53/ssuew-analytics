-- ============================================================
-- SSUEW Analytics Platform — Supabase schema
-- Wklej całość do SQL Editor w Supabase Dashboard
-- ============================================================

-- Rekrutacje: każda edycja to jeden wiersz
create table if not exists rekrutacje (
  id             uuid primary key default gen_random_uuid(),
  edycja         text not null,          -- "J'25", "W'26"
  sezon          text not null check (sezon in ('jesien', 'wiosna')),
  rok            int  not null,          -- rok akademicki startu
  zgloszenia     int  not null check (zgloszenia > 0),
  przyjeci       int  not null check (przyjeci >= 0),
  created_at     timestamptz default now(),
  unique (edycja)
);

-- Kohorty: dane o zatrzymaniu członków per edycja
create table if not exists kohorty (
  id                  uuid primary key default gen_random_uuid(),
  edycja              text not null unique,
  sezon               text not null check (sezon in ('jesien', 'wiosna')),
  rok                 int  not null,
  n_czlonkow          int  not null,
  avg_retention_sem   numeric(4,2) not null,
  max_retention_sem   int  not null,
  in_progress         boolean default false,
  survival            numeric[],            -- realna krzywa przeżycia: % aktywnych po t sem.
  created_at          timestamptz default now()
);

-- Komisje: słownik komisji
create table if not exists komisje (
  id              uuid primary key default gen_random_uuid(),
  kod             text not null unique,   -- "P.KA."
  nazwa           text not null,
  przewodniczacy  text,
  created_at      timestamptz default now()
);

-- KPI komisji: dane per komisja per semestr
create table if not exists kpi_periods (
  id                      uuid primary key default gen_random_uuid(),
  komisja_id              uuid not null references komisje(id) on delete cascade,
  semestr                 text not null,   -- "letni 2025/2026"
  projekty_planowane      int  not null check (projekty_planowane > 0),
  projekty_zrealizowane   int  not null check (projekty_zrealizowane >= 0),
  kpi_custom              jsonb default '{}',
  notatka                 text,
  created_at              timestamptz default now(),
  unique (komisja_id, semestr)
);

-- KPI rok-do-roku (realny model SSUEW): metryka z wartością zeszłoroczną i tegoroczną
create table if not exists kpi_metrics (
  id                  uuid primary key default gen_random_uuid(),
  kategoria           text not null,   -- 'SKS', 'Wydarzenia', 'Ankieta', 'Koordynatorzy'
  nazwa               text not null,   -- 'Październik', 'Wigilia', ...
  okres_poprzedni     text not null,   -- '2024/2025'
  wartosc_poprzednia  numeric not null,
  okres_biezacy       text not null,   -- '2025/2026'
  wartosc_biezaca     numeric not null,
  created_at          timestamptz default now()
);

-- Członkowie: aktywność per semestr (widok per-osoba). UWAGA: dane osobowe — tylko Twoja baza.
create table if not exists czlonkowie (
  id              uuid primary key default gen_random_uuid(),
  kohorta_edycja  text not null,          -- "J'24"
  imie_nazwisko   text not null,
  status          text not null default 'aktywny'
                    check (status in ('aktywny','wspierający','alumn','zawieszone','nieaktywny')),
  aktywnosc       int[] default '{}',     -- 0=nieaktywny, 1=aktywny, 2=wspierający (per semestr)
  created_at      timestamptz default now()
);

-- ─── Row Level Security ──────────────────────────────────────
-- Na start: odczyt publiczny, zapis tylko authenticated
-- Docelowo: restrict to @samorzad.ue.wroc.pl OAuth

alter table rekrutacje   enable row level security;
alter table kohorty      enable row level security;
alter table komisje      enable row level security;
alter table kpi_periods  enable row level security;
alter table kpi_metrics  enable row level security;

create policy "public read rekrutacje"   on rekrutacje   for select using (true);
create policy "public read kohorty"      on kohorty      for select using (true);
create policy "public read komisje"      on komisje      for select using (true);
create policy "public read kpi_periods"  on kpi_periods  for select using (true);
create policy "public read kpi_metrics"  on kpi_metrics  for select using (true);
create policy "auth insert kpi_metrics"  on kpi_metrics  for insert with check (auth.role() = 'authenticated');
alter table czlonkowie enable row level security;
create policy "public read czlonkowie"   on czlonkowie   for select using (true);
create policy "auth insert czlonkowie"   on czlonkowie   for insert with check (auth.role() = 'authenticated');
create policy "auth update czlonkowie"   on czlonkowie   for update using (auth.role() = 'authenticated');

create policy "auth insert rekrutacje"   on rekrutacje   for insert with check (auth.role() = 'authenticated');
create policy "auth update rekrutacje"   on rekrutacje   for update using (auth.role() = 'authenticated');
create policy "auth insert kohorty"      on kohorty      for insert with check (auth.role() = 'authenticated');
create policy "auth update kohorty"      on kohorty      for update using (auth.role() = 'authenticated');
create policy "auth insert komisje"      on komisje      for insert with check (auth.role() = 'authenticated');
create policy "auth insert kpi_periods"  on kpi_periods  for insert with check (auth.role() = 'authenticated');
create policy "auth update kpi_periods"  on kpi_periods  for update using (auth.role() = 'authenticated');

-- ─── Dane historyczne SSUEW (seed) ───────────────────────────

-- Realne dane (KPI SSUEW.xlsx — PRZYJĘCI DZIAŁACZE); zgłoszenia od rekrutacji J'23.
insert into rekrutacje (edycja, sezon, rok, zgloszenia, przyjeci) values
  ('J''23', 'jesien', 2023, 100, 38),
  ('W''24', 'wiosna', 2024, 28,  13),
  ('J''24', 'jesien', 2024, 149, 38),
  ('W''25', 'wiosna', 2025, 31,  10),
  ('J''25', 'jesien', 2025, 138, 45),
  ('W''26', 'wiosna', 2026, 18,  11)
on conflict (edycja) do nothing;

-- Realne dane (Analiza - długość działania.xlsx). survival = realna krzywa przeżycia per-osoba.
insert into kohorty (edycja, sezon, rok, n_czlonkow, avg_retention_sem, max_retention_sem, in_progress, survival) values
  ('W''22', 'wiosna', 2022, 14, 4.36, 9,  false, '{100,100,100,100,73,36,9,9,9}'),
  ('J''22', 'jesien', 2022, 39, 4.24, 8,  false, '{100,100,100,85,73,33,18,9,6}'),
  ('W''23', 'wiosna', 2023, 11, 4.20, 7,  false, '{100,100,90,90,60,30,30,20}'),
  ('J''23', 'jesien', 2023, 39, 3.86, 6,  false, '{100,100,97,83,63,31,11}'),
  ('W''24', 'wiosna', 2024, 13, 2.69, 5,  false, '{100,100,77,69,23}'),
  ('J''24', 'jesien', 2024, 38, 3.53, 4,  false, '{100,100,100,80,73}'),
  ('W''25', 'wiosna', 2025, 10, 1.80, 3,  true,  '{100,60,60,60}')
on conflict (edycja) do nothing;

insert into komisje (kod, nazwa) values
  ('P.KA.',    'Komisja ds. Administracji'),
  ('P.KF.',    'Komisja ds. Finansów'),
  ('P.KKZ.',   'Komisja ds. Kultury i Zabawy'),
  ('P.KHR.',   'Komisja ds. HR'),
  ('P.KP.',    'Komisja ds. Promocji'),
  ('P.KDiJK.', 'Komisja ds. DiJK')
on conflict (kod) do nothing;

-- Realne KPI rok-do-roku (KPI SSUEW.xlsx, arkusz 20252026): 2024/2025 → 2025/2026
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
  ('Koordynatorzy', 'Wigilia',  '2024/2025', 9, '2025/2026', 12),
  ('Koordynatorzy', 'Gala',     '2024/2025', 1, '2025/2026', 5),
  ('Koordynatorzy', 'Adapciak', '2024/2025', 2, '2025/2026', 1),
  ('Koordynatorzy', 'Animalia', '2024/2025', 1, '2025/2026', 2);
