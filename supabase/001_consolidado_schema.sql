create extension if not exists pgcrypto;

create table if not exists public.consolidado_programas (
  id uuid primary key default gen_random_uuid(),
  process_code text not null,
  snies text,
  faculty text not null,
  program text not null,
  degree text,
  location text,
  level text,
  modality text,
  rc_start date,
  rc_duration_years numeric,
  rc_end date,
  rrc_siga date,
  rrc_mineducacion date,
  has_current_rc boolean,
  acreditable boolean default false,
  accredited boolean default false,
  in_accreditation_process boolean default false,
  aac_start date,
  aac_duration_years numeric,
  aac_end date,
  improvement_halfway date,
  source text not null default 'excel',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists consolidado_programas_process_snies_uidx
on public.consolidado_programas (process_code, coalesce(snies, ''));

create index if not exists consolidado_programas_faculty_idx
on public.consolidado_programas (faculty);

create index if not exists consolidado_programas_program_idx
on public.consolidado_programas (program);

create index if not exists consolidado_programas_rrc_mineducacion_idx
on public.consolidado_programas (rrc_mineducacion);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_consolidado_programas_updated_at on public.consolidado_programas;
create trigger trg_consolidado_programas_updated_at
before update on public.consolidado_programas
for each row
execute function public.set_updated_at();

alter table public.consolidado_programas enable row level security;

-- Public read-only access for dashboard queries.
drop policy if exists "consolidado_programas_select_anon" on public.consolidado_programas;
create policy "consolidado_programas_select_anon"
on public.consolidado_programas
for select
to anon, authenticated
using (true);
