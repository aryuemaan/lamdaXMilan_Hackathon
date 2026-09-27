# IITH Sports Council — InterIIT management

Practice management for every IIT Hyderabad InterIIT team: morning and evening attendance, coach and team-coordination ratings, rankings, automatic line-up selection, a match simulator for goal sports, personal drill suggestions, anonymous teammate ratings and Excel reports.

It is the hockey app generalised: every sport is a block of settings in `src/config/sports.js`, and the scoring model is unchanged (40% coach rating, 30% team coordination, 30% attendance, with match-day penalties).

## Who sees what

| Role | Can do |
|---|---|
| Sports council | Readiness board across all teams, team and coach management, contingent leaderboard, edit any register, whole-contingent Excel export |
| Coach / captain | Everything for their own teams only: attendance, ratings, comments, roster, import, selection, simulator, insights, exports |
| Athlete | Own score and drills, team rankings, line-up status, compare, rate teammates on days they trained |

These limits are enforced in the database with row-level security, not only in the interface. Phone numbers are kept in a separate table athletes can't read, and teammate ratings are only ever exposed as an anonymous average.

## Setup (new Supabase project)

1. **Create the database.** Supabase → SQL Editor → paste and run `supabase/schema.sql`. This creates the tables, security rules and the 18 default teams.
2. **Create yourself as council.** Authentication → Users → Add user (tick auto-confirm). Copy the user's UUID and run:
   ```sql
   insert into public.user_profiles (id, role, display_name, email)
   values ('PASTE-UUID', 'council', 'Sports Secretary', 'you@iith.ac.in');
   ```
3. **Deploy the login function** (needed for creating athlete and coach logins from the app):
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase functions deploy create-account
   ```
4. **Run the app.**
   ```bash
   cp .env.example .env.local     # fill in URL and anon key (Project Settings → API)
   npm install
   npm run dev
   ```
5. **Deploy** (Vercel or Netlify): build command `npm run build`, output folder `dist`, and add the two `VITE_SUPABASE_*` environment variables. In Supabase → Authentication → URL Configuration, add your site URL so password-reset emails link back correctly.

## Upgrading your existing hockey database

Your hockey data is kept and becomes the `hockey-m` team.

1. Back up the database.
2. Run `supabase/migrate_from_hockey.sql`, then run `supabase/schema.sql`.
3. Make yourself council (the last commented line in the migration file shows how).
4. Deploy the new `create-account` function. The old `create-player-account` function is no longer used.

What the migration does: adds `team_id` to players, sessions and teammate ratings; turns the fixed skill columns (fitness, dribbling, …) into a `baseline` JSON field so each sport can have its own skills; copies phone numbers into `player_private`; converts session comments to JSON; replaces the sessions unique key with `(team_id, session_date, slot, player_id)`; links existing coaches to hockey; and removes old security policies so `schema.sql` can install the new ones.

## Day-to-day

- **Council** adds coach logins in Manage → Accounts and ticks which teams each coach runs. A coach who leads two teams (e.g. basketball men and women) switches between them with the team picker.
- **Coaches** add athletes in Roster, or use *Import from sheet* with the Google Form export (a template is available in the import dialog). Adding an email and WhatsApp number creates the athlete's login: the email is the username and the WhatsApp number is the first password. Athletes can change it under More → Account.
- **Attendance** saves automatically about half a second after each tap. The pill in the top bar shows *Saved*, *Saving…* or *Not saved*; tap it to retry and reload. Failed saves are retried every few seconds.

## Customising

- **Season dates, meet date, attendance target, scoring weights:** `src/config/app.js`.
- **Sports:** `src/config/sports.js`. Each sport lists its roles, InterIIT squad size, line-up shapes (formations), self-assessment skills with drills and tips, optional role-specific drills (e.g. goalkeepers), optional match days, and `sim.base` if it should get the match simulator.
- **Adding a sport:** add an entry to `SPORTS`, then create the team in the app (Teams → Add team) or insert a row in `teams`.
- **Adding a team for an existing sport** (e.g. Football Women): Teams → Add team. No code changes needed.

## Project layout

```
src/
  App.jsx                  auth gate
  state/AppProvider.jsx    data loading, save queue, permissions, navigation state
  config/                  app settings and sport definitions
  lib/                     dates, stats/selection/simulator, Supabase data layer, Excel import/export
  components/              shared UI (shell, stars, selection board, suggestions, teammate ratings…)
  views/council/           readiness board, teams, athletes
  views/team/              attendance, roster, sessions, rankings, selection, match sim, analytics, compare, feed
  views/shared/            profile, alumni, manage, more
  views/player/            athlete dashboard
supabase/
  schema.sql               tables, security rules, seed teams
  migrate_from_hockey.sql  upgrade path for the existing database
  functions/create-account edge function for creating logins
```

## Notes

- Supabase returns at most 1,000 rows per request; the app pages through results, so large seasons load completely.
- The `xlsx` package from npm (0.18.5) has known advisories for parsing untrusted files. Only staff can import, but you can switch to SheetJS's maintained build: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.
- Athletes see changes after reloading or tapping Refresh. For live updates, enable Supabase Realtime on `sessions` and subscribe in `AppProvider`.
