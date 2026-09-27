-- ============================================================
-- IITH Sports Council — database schema (fresh install)
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- Upgrading from the hockey-only app? Run migrate_from_hockey.sql instead.
-- ============================================================

-- ---------- tables ----------
create table if not exists public.teams (
  id          text primary key,                 -- e.g. 'hockey-m'
  sport       text not null,                    -- key in src/config/sports.js
  category    text not null check (category in ('Men','Women','Mixed')),
  coach_name  text,
  venue       text,
  active      boolean not null default true,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);

create table if not exists public.players (
  id             text primary key,
  team_id        text not null references public.teams(id) on delete cascade,
  name           text not null,
  jersey         int,
  position       text,
  positions_raw  text,
  gender         text,
  year           text,
  department     text,
  age            int,
  played_before  boolean not null default false,
  experience     text,
  availability   text,
  health         text,
  pre_rating     numeric not null default 0,
  baseline       jsonb not null default '{}'::jsonb,   -- { skillKey: 1..5 } — skills differ per sport
  active         boolean not null default true,
  joined_date    date not null default '2026-09-21',
  graduated      boolean not null default false,
  graduated_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists players_team_idx on public.players(team_id);

-- Contact details live apart so athletes can't read each other's phone numbers.
create table if not exists public.player_private (
  player_id  text primary key references public.players(id) on delete cascade,
  phone      text,
  email      text
);

create table if not exists public.sessions (
  id            bigint generated always as identity primary key,
  team_id       text not null references public.teams(id) on delete cascade,
  session_date  date not null,
  slot          text not null check (slot in ('morning','evening')),
  player_id     text not null,        -- a player id, or '__NOPRACTICE__' for a no-practice marker
  status        text not null check (status in ('present','late','absent','escape','no_practice')),
  coach_rating  numeric not null default 0,
  team_rating   numeric not null default 0,
  comments      jsonb not null default '[]'::jsonb,   -- [{text,time,...}] or {reason} for no-practice rows
  updated_at    timestamptz not null default now(),
  unique (team_id, session_date, slot, player_id)
);
create index if not exists sessions_team_date_idx on public.sessions(team_id, session_date);

create table if not exists public.teammate_ratings (
  id               bigint generated always as identity primary key,
  team_id          text not null references public.teams(id) on delete cascade,
  session_date     date not null,
  rater_player_id  text not null references public.players(id) on delete cascade,
  rated_player_id  text not null references public.players(id) on delete cascade,
  rating           int not null check (rating between 1 and 5),
  created_at       timestamptz not null default now(),
  unique (session_date, rater_player_id, rated_player_id)
);
create index if not exists tr_rated_idx on public.teammate_ratings(rated_player_id);

create table if not exists public.user_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null check (role in ('council','coach','player')),
  display_name  text,
  email         text,
  player_id     text references public.players(id) on delete set null,
  team_ids      text[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists sessions_touch on public.sessions;
create trigger sessions_touch before update on public.sessions for each row execute function public.touch_updated_at();

-- ---------- helper functions (security definer avoids RLS recursion) ----------
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.user_profiles where id = auth.uid()
$$;
create or replace function public.my_team_ids() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(team_ids, '{}') from public.user_profiles where id = auth.uid()
$$;
create or replace function public.my_player_id() returns text
language sql stable security definer set search_path = public as $$
  select player_id from public.user_profiles where id = auth.uid()
$$;
create or replace function public.my_player_team() returns text
language sql stable security definer set search_path = public as $$
  select p.team_id from public.players p join public.user_profiles u on u.player_id = p.id where u.id = auth.uid()
$$;
create or replace function public.can_manage_team(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'council' or (public.app_role() = 'coach' and t = any(public.my_team_ids())), false)
$$;
-- Anonymous average for one athlete (raters are never exposed)
create or replace function public.teammate_rating_summary(p_player text)
returns table(avg_rating numeric, rating_count int)
language sql stable security definer set search_path = public as $$
  select round(avg(rating)::numeric, 2), count(*)::int
  from public.teammate_ratings
  where rated_player_id = p_player and auth.uid() is not null
$$;
grant execute on function public.app_role(), public.my_team_ids(), public.my_player_id(), public.my_player_team(),
  public.can_manage_team(text), public.teammate_rating_summary(text) to authenticated;

-- ---------- row-level security ----------
alter table public.teams            enable row level security;
alter table public.players          enable row level security;
alter table public.player_private   enable row level security;
alter table public.sessions         enable row level security;
alter table public.teammate_ratings enable row level security;
alter table public.user_profiles    enable row level security;

-- teams: everyone signed in can read; council edits
drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select to authenticated using (true);
drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for all to authenticated
  using (public.app_role() = 'council') with check (public.app_role() = 'council');

-- players: everyone signed in can read (rankings); council or the team's coach edits
drop policy if exists players_read on public.players;
create policy players_read on public.players for select to authenticated using (true);
drop policy if exists players_insert on public.players;
create policy players_insert on public.players for insert to authenticated with check (public.can_manage_team(team_id));
drop policy if exists players_update on public.players;
create policy players_update on public.players for update to authenticated
  using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));
drop policy if exists players_delete on public.players;
create policy players_delete on public.players for delete to authenticated using (public.app_role() = 'council');

-- player_private: staff of that team only
drop policy if exists pp_all on public.player_private;
create policy pp_all on public.player_private for all to authenticated
  using (public.can_manage_team((select team_id from public.players where id = player_id)))
  with check (public.can_manage_team((select team_id from public.players where id = player_id)));

-- sessions: staff read everything; athletes read their own team; staff of the team write
drop policy if exists sessions_read on public.sessions;
create policy sessions_read on public.sessions for select to authenticated
  using (public.app_role() in ('council','coach') or team_id = public.my_player_team());
drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions for insert to authenticated with check (public.can_manage_team(team_id));
drop policy if exists sessions_update on public.sessions;
create policy sessions_update on public.sessions for update to authenticated
  using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));
drop policy if exists sessions_delete on public.sessions;
create policy sessions_delete on public.sessions for delete to authenticated using (public.can_manage_team(team_id));

-- teammate ratings: athletes insert their own, only on a day they attended, only for their team;
-- they can read only rows they wrote. No updates or deletes (immutable).
drop policy if exists tr_read on public.teammate_ratings;
create policy tr_read on public.teammate_ratings for select to authenticated
  using (public.can_manage_team(team_id) or rater_player_id = public.my_player_id());
drop policy if exists tr_insert on public.teammate_ratings;
create policy tr_insert on public.teammate_ratings for insert to authenticated with check (
  rater_player_id = public.my_player_id()
  and team_id = public.my_player_team()
  and rated_player_id <> rater_player_id
  and exists (select 1 from public.players p where p.id = rated_player_id and p.team_id = teammate_ratings.team_id)
  and exists (
    select 1 from public.sessions s
    where s.team_id = teammate_ratings.team_id and s.session_date = teammate_ratings.session_date
      and s.player_id = teammate_ratings.rater_player_id and s.status in ('present','late')
  )
);

-- user_profiles: read your own; council reads all and edits team links.
-- New profiles are created only by the create-account edge function (service role).
drop policy if exists up_read on public.user_profiles;
create policy up_read on public.user_profiles for select to authenticated
  using (id = auth.uid() or public.app_role() = 'council');
drop policy if exists up_update on public.user_profiles;
create policy up_update on public.user_profiles for update to authenticated
  using (public.app_role() = 'council') with check (public.app_role() = 'council');

-- ---------- seed teams ----------
insert into public.teams (id, sport, category, sort_order) values
  ('hockey-m','hockey','Men',10), ('football-m','football','Men',20), ('cricket-m','cricket','Men',30),
  ('basketball-m','basketball','Men',40), ('basketball-w','basketball','Women',41),
  ('volleyball-m','volleyball','Men',50), ('volleyball-w','volleyball','Women',51),
  ('badminton-m','badminton','Men',60), ('badminton-w','badminton','Women',61),
  ('tt-m','tt','Men',70), ('tt-w','tt','Women',71), ('tennis-m','tennis','Men',80),
  ('athletics-x','athletics','Mixed',90), ('aquatics-m','aquatics','Men',100), ('chess-x','chess','Mixed',110),
  ('squash-m','squash','Men',120), ('weightlifting-m','weightlifting','Men',130), ('waterpolo-m','waterpolo','Men',140)
on conflict (id) do nothing;

-- ---------- first council account ----------
-- 1. Supabase → Authentication → Users → Add user (email + password, auto-confirm).
-- 2. Copy the new user's UUID and run:
--    insert into public.user_profiles (id, role, display_name, email)
--    values ('PASTE-UUID-HERE', 'council', 'Sports Secretary', 'you@iith.ac.in');
-- Everyone else is created from inside the app.
