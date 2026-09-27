-- ============================================================
-- Upgrade the existing hockey-only database to multi-sport.
-- 1. BACK UP FIRST (Database → Backups, or export the tables).
-- 2. Run this file in Supabase → SQL Editor.
-- 3. Then run schema.sql (it adds the security rules and the other teams).
-- Everything here is written to be safe to re-run.
-- ============================================================

-- ---------- 0. helper: tolerant text → jsonb ----------
create or replace function public._try_jsonb(t text, fallback jsonb) returns jsonb
language plpgsql immutable as $$
begin
  if t is null or btrim(t) = '' then return fallback; end if;
  return t::jsonb;
exception when others then return fallback;
end $$;

-- ---------- 1. teams ----------
create table if not exists public.teams (
  id text primary key, sport text not null, category text not null check (category in ('Men','Women','Mixed')),
  coach_name text, venue text, active boolean not null default true, sort_order int not null default 100,
  created_at timestamptz not null default now()
);
insert into public.teams (id, sport, category, sort_order, venue) values ('hockey-m','hockey','Men',10,'Hockey turf')
on conflict (id) do nothing;

-- ---------- 2. players ----------
alter table public.players add column if not exists team_id text;
update public.players set team_id = 'hockey-m' where team_id is null;
alter table public.players alter column team_id set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'players_team_id_fkey') then
    alter table public.players add constraint players_team_id_fkey foreign key (team_id) references public.teams(id) on delete cascade;
  end if;
end $$;
alter table public.players add column if not exists gender text;
alter table public.players add column if not exists baseline jsonb not null default '{}'::jsonb;
alter table public.players add column if not exists created_at timestamptz not null default now();
alter table public.players add column if not exists graduated boolean not null default false;
alter table public.players add column if not exists graduated_at timestamptz;

-- old fixed skill columns → baseline jsonb (keys match src/config/sports.js hockey skills)
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='players' and column_name='fitness') then
    execute $q$
      update public.players set baseline = jsonb_strip_nulls(jsonb_build_object(
        'fitness', fitness, 'dribbling', dribbling, 'passing', passing,
        'dragFlick', drag_flick, 'tackling', tackling, 'goalScoring', goal_scoring))
      where baseline = '{}'::jsonb
    $q$;
  end if;
end $$;

-- phone numbers → private table
create table if not exists public.player_private (
  player_id text primary key references public.players(id) on delete cascade, phone text, email text
);
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='players' and column_name='phone') then
    execute $q$ insert into public.player_private (player_id, phone)
      select id, phone from public.players where phone is not null and phone <> ''
      on conflict (player_id) do nothing $q$;
  end if;
end $$;
-- After checking the app works, you can remove the old columns:
-- alter table public.players drop column phone, drop column fitness, drop column dribbling,
--   drop column passing, drop column drag_flick, drop column tackling, drop column goal_scoring;

-- ---------- 3. sessions ----------
alter table public.sessions add column if not exists team_id text;
update public.sessions set team_id = 'hockey-m' where team_id is null;
alter table public.sessions alter column team_id set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_team_id_fkey') then
    alter table public.sessions add constraint sessions_team_id_fkey foreign key (team_id) references public.teams(id) on delete cascade;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sessions' and column_name='id') then
    alter table public.sessions add column id bigint generated always as identity;
  end if;
end $$;
alter table public.sessions add column if not exists updated_at timestamptz not null default now();

-- comments: text → jsonb
do $$ begin
  if (select data_type from information_schema.columns where table_schema='public' and table_name='sessions' and column_name='comments') <> 'jsonb' then
    alter table public.sessions alter column comments drop default;
    alter table public.sessions alter column comments type jsonb using public._try_jsonb(comments::text, '[]'::jsonb);
  end if;
end $$;
update public.sessions set comments = '[]'::jsonb where comments is null;
alter table public.sessions alter column comments set default '[]'::jsonb;
alter table public.sessions alter column comments set not null;

-- replace old unique keys (session_date, slot, player_id) with one that includes team_id
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid = 'public.sessions'::regclass and contype = 'u' loop
    execute format('alter table public.sessions drop constraint %I', c.conname);
  end loop;
  for c in select indexname from pg_indexes where schemaname='public' and tablename='sessions' and indexdef ilike 'create unique index%' and indexname not ilike '%pkey%' loop
    execute format('drop index if exists public.%I', c.indexname);
  end loop;
end $$;
alter table public.sessions add constraint sessions_team_id_session_date_slot_player_id_key unique (team_id, session_date, slot, player_id);
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid = 'public.sessions'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%' loop
    execute format('alter table public.sessions drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.sessions add constraint sessions_status_check check (status in ('present','late','absent','escape','no_practice'));

-- ---------- 4. teammate ratings ----------
alter table public.teammate_ratings add column if not exists team_id text;
update public.teammate_ratings set team_id = 'hockey-m' where team_id is null;
alter table public.teammate_ratings alter column team_id set not null;
alter table public.teammate_ratings add column if not exists created_at timestamptz not null default now();
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.teammate_ratings'::regclass and contype = 'u') then
    alter table public.teammate_ratings add constraint teammate_ratings_unique unique (session_date, rater_player_id, rated_player_id);
  end if;
end $$;

-- ---------- 5. user profiles ----------
alter table public.user_profiles add column if not exists display_name text;
alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists team_ids text[] not null default '{}';
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid = 'public.user_profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%' loop
    execute format('alter table public.user_profiles drop constraint %I', c.conname);
  end loop;
end $$;
-- existing hockey coaches keep hockey
update public.user_profiles set team_ids = array['hockey-m'] where role = 'coach' and (team_ids is null or team_ids = '{}');
alter table public.user_profiles add constraint user_profiles_role_check check (role in ('council','coach','player'));
update public.user_profiles u set email = a.email from auth.users a where a.id = u.id and u.email is null;

-- ---------- 6. clear old security policies (schema.sql recreates them) ----------
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('teams','players','player_private','sessions','teammate_ratings','user_profiles') loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- ---------- 7. promote yourself to council ----------
-- update public.user_profiles set role = 'council', team_ids = '{}' where email = 'YOUR-EMAIL@iith.ac.in';

-- Now run schema.sql.
