-- =============================================================================
-- Elections results columns required by dashboard RPCs (017) and live results (014)
-- Safe to run if 014 was skipped or only partially applied.
-- =============================================================================

alter table public.elections
  add column if not exists winner_id uuid references public.candidates (id) on delete set null;

alter table public.elections
  add column if not exists turnout_percentage numeric(6, 2);

alter table public.elections
  add column if not exists result_locked boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'elections'
      and column_name = 'result_status'
  ) then
    alter table public.elections
      add column result_status text not null default 'Processing';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'elections_result_status_check'
  ) then
    alter table public.elections
      add constraint elections_result_status_check
      check (result_status in ('Processing', 'Completed', 'Locked'));
  end if;
exception
  when others then
    raise notice 'elections_result_status_check not added: %', sqlerrm;
end;
$$;

comment on column public.elections.winner_id is 'Winning candidate after results are computed';
comment on column public.elections.turnout_percentage is 'Percentage of registered voters who voted';
comment on column public.elections.result_status is 'Processing | Completed | Locked';
