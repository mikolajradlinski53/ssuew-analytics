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

-- ─── Row Level Security ──────────────────────────────────────
-- Na start: odczyt publiczny, zapis tylko authenticated
-- Docelowo: restrict to @samorzad.ue.wroc.pl OAuth

alter table rekrutacje   enable row level security;
alter table kohorty      enable row level security;
alter table komisje      enable row level security;
alter table kpi_periods  enable row level security;

create policy "public read rekrutacje"   on rekrutacje   for select using (true);
create policy "public read kohorty"      on kohorty      for select using (true);
create policy "public read komisje"      on komisje      for select using (true);
create policy "public read kpi_periods"  on kpi_periods  for select using (true);

create policy "auth insert rekrutacje"   on rekrutacje   for insert with check (auth.role() = 'authenticated');
create policy "auth update rekrutacje"   on rekrutacje   for update using (auth.role() = 'authenticated');
create policy "auth insert kohorty"      on kohorty      for insert with check (auth.role() = 'authenticated');
create policy "auth update kohorty"      on kohorty      for update using (auth.role() = 'authenticated');
create policy "auth insert komisje"      on komisje      for insert with check (auth.role() = 'authenticated');
create policy "auth insert kpi_periods"  on kpi_periods  for insert with check (auth.role() = 'authenticated');
create policy "auth update kpi_periods"  on kpi_periods  for update using (auth.role() = 'authenticated');

-- ─── Dane historyczne SSUEW (seed) ───────────────────────────

insert into rekrutacje (edycja, sezon, rok, zgloszenia, przyjeci) values
  ('W''22', 'wiosna', 2022, 13, 11),
  ('J''22', 'jesien', 2022, 40, 33),
  ('W''23', 'wiosna', 2023, 13, 10),
  ('J''23', 'jesien', 2023, 32, 28),
  ('W''24', 'wiosna', 2024, 11, 13),
  ('J''24', 'jesien', 2024, 32, 13),
  ('W''25', 'wiosna', 2025, 10, 10),
  ('J''25', 'jesien', 2025, 43, 14)
on conflict (edycja) do nothing;

insert into kohorty (edycja, sezon, rok, n_czlonkow, avg_retention_sem, max_retention_sem, in_progress) values
  ('W''22', 'wiosna', 2022, 11, 4.36, 9,  false),
  ('J''22', 'jesien', 2022, 33, 4.24, 8,  false),
  ('W''23', 'wiosna', 2023, 10, 4.20, 7,  false),
  ('J''23', 'jesien', 2023, 28, 3.86, 6,  false),
  ('W''24', 'wiosna', 2024, 13, 2.69, 5,  false),
  ('J''24', 'jesien', 2024, 30, 3.53, 4,  false),
  ('W''25', 'wiosna', 2025, 10, 1.80, 3,  true),
  ('J''25', 'jesien', 2025, 14, 0.00, 1,  true)
on conflict (edycja) do nothing;

insert into komisje (kod, nazwa) values
  ('P.KA.',    'Komisja ds. Administracji'),
  ('P.KF.',    'Komisja ds. Finansów'),
  ('P.KKZ.',   'Komisja ds. Kultury i Zabawy'),
  ('P.KHR.',   'Komisja ds. HR'),
  ('P.KP.',    'Komisja ds. Promocji'),
  ('P.KDiJK.', 'Komisja ds. DiJK')
on conflict (kod) do nothing;
