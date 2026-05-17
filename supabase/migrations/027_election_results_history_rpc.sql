-- =============================================================================
-- Election results history RPC (from 014). Requires votes table (025).
-- =============================================================================

alter table public.elections
  add column if not exists winner_id uuid references public.candidates (id) on delete set null;

alter table public.elections
  add column if not exists turnout_percentage numeric(6, 2);

alter table public.elections
  add column if not exists result_locked boolean not null default false;

alter table public.elections
  add column if not exists approval_status text;

update public.elections
set approval_status = 'Approved'
where approval_status is null
  and status <> 'Draft';

alter table public.polls
  add column if not exists is_staging boolean not null default false;

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

create or replace function public.get_election_results_history()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(row_data order by (row_data->>'end_datetime') desc)
      from (
        select jsonb_build_object(
          'id',
          e.id,
          'title',
          e.title,
          'category',
          e.category,
          'status',
          e.status,
          'end_datetime',
          e.end_datetime,
          'result_status',
          coalesce(e.result_status, 'Processing'),
          'result_locked',
          coalesce(e.result_locked, false),
          'turnout_percentage',
          e.turnout_percentage,
          'total_votes',
          (
            select count(*)::integer
            from public.votes v
            join public.polls p on p.id = v.poll_id
            where p.election_id = e.id
              and coalesce(p.is_staging, false) = false
          ),
          'winner',
          case
            when w.id is not null then jsonb_build_object(
              'id',
              w.id,
              'name',
              w.name,
              'photo_url',
              w.photo_url
            )
            else null
          end,
          'result_date',
          e.end_datetime
        ) as row_data
        from public.elections e
        left join public.candidates w on w.id = e.winner_id
        where e.status <> 'Draft'
          and coalesce(e.approval_status, 'Approved') = 'Approved'
          and (
            public.is_super_admin()
            or public.is_election_creator(e.id)
            or (
              coalesce(e.result_status, 'Processing') in ('Completed', 'Locked')
              and exists (
                select 1
                from public.voter_registrations vr
                where vr.election_id = e.id
                  and vr.voter_id = v_user_id
                  and vr.status in ('Registered', 'Approved')
              )
            )
            or (
              exists (
                select 1
                from public.voter_registrations vr
                where vr.election_id = e.id
                  and vr.voter_id = v_user_id
                  and vr.status in ('Registered', 'Approved')
              )
              and now() > e.end_datetime
            )
          )
      ) sub
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_election_results_history() to authenticated;
