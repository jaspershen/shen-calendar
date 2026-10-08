-- Run once in the Supabase SQL Editor before enabling sign-in.
create table if not exists public.calendar_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 tasks jsonb not null default '[]'::jsonb check (jsonb_typeof(tasks) = 'array'),
 revision bigint not null default 0 check (revision >= 0)
);
alter table public.calendar_state enable row level security;
revoke all on public.calendar_state from anon;
grant select, insert, update on public.calendar_state to authenticated;
create policy "Read own calendar" on public.calendar_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own calendar" on public.calendar_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own calendar" on public.calendar_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
