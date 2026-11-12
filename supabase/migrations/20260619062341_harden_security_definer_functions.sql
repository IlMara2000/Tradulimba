-- Trigger functions do not need to be callable through the Data API.
-- Some restored/fresh databases do not contain these legacy functions, so
-- harden them only when they are present.

do $migration$
begin
  if to_regprocedure('public.handle_new_user()') is not null then
    alter function public.handle_new_user() set search_path = '';
    revoke execute on function public.handle_new_user() from public, anon, authenticated;
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    alter function public.rls_auto_enable() set search_path = pg_catalog;
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$migration$;
