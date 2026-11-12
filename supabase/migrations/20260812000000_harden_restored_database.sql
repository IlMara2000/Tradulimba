begin;

set local lock_timeout = '5s';

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.alarms enable row level security;
alter table public.notes enable row level security;
alter table public.note_folders enable row level security;
alter table public.push_subscriptions enable row level security;

-- Remove broad policies inherited from the legacy project. The canonical
-- owner-scoped policies created by the application migrations remain intact.
drop policy if exists "Gli utenti possono leggere i profili" on public.profiles;
drop policy if exists "Gli utenti possono aggiornare il proprio profilo" on public.profiles;

-- owner_id is the single authorization identity used by the application.
alter table public.profiles drop constraint if exists profiles_id_fkey;
create unique index if not exists idx_profiles_owner_id on public.profiles(owner_id);

-- Create new profiles with the fields required by the current schema, without
-- copying authentication email addresses into the public schema.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, owner_id)
  values (new.id, new.id)
  on conflict do nothing;
  return new;
end;
$function$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

do $migration$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    alter function public.rls_auto_enable() set search_path = pg_catalog;
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$migration$;

-- RLS decides which rows are accessible; table ACLs expose only the CRUD
-- operations used by the app and never administrative operations such as
-- TRUNCATE, TRIGGER, REFERENCES, or MAINTAIN.
revoke all privileges on table
  public.profiles,
  public.tasks,
  public.focus_sessions,
  public.alarms,
  public.notes,
  public.note_folders,
  public.push_subscriptions
from public, anon, authenticated, service_role;

grant select, insert, update, delete on table
  public.profiles,
  public.tasks,
  public.focus_sessions,
  public.alarms,
  public.notes,
  public.note_folders,
  public.push_subscriptions
to authenticated, service_role;

-- Keep future Data API objects opt-in instead of inheriting broad grants.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all privileges on functions from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
