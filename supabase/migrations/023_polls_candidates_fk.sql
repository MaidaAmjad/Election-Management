-- Ensure candidates.poll_id FK exists so PostgREST can embed polls → candidates (after reload).
-- Safe if 018_candidates_poll_scope.sql was already applied.

alter table public.candidates
  add column if not exists poll_id uuid;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'candidates'
      and constraint_name = 'candidates_poll_id_fkey'
  ) then
    alter table public.candidates
      add constraint candidates_poll_id_fkey
      foreign key (poll_id) references public.polls (id) on delete cascade;
  end if;
exception
  when others then
    raise notice 'candidates_poll_id_fkey: %', sqlerrm;
end;
$$;

create index if not exists candidates_poll_id_idx on public.candidates (poll_id);
