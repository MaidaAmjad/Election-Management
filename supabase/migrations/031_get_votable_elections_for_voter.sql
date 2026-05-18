-- =============================================================================
-- Patch: get_votable_elections_for_voter (missing if 013_voting_module was skipped)
-- Aligns with voter dashboard: registered voters, non-staging polls.
-- =============================================================================

alter table public.secret_ids
  add column if not exists used_at timestamptz;

alter table public.polls
  add column if not exists is_staging boolean not null default false;

create or replace function public.get_voting_phase(p_election_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
begin
  select * into v_election from public.elections where id = p_election_id;
  if not found then
    return 'unavailable';
  end if;

  if v_election.status = 'Draft' then
    return 'unavailable';
  end if;

  if v_election.status = 'Completed' or now() > v_election.end_datetime then
    return 'closed';
  end if;

  if now() < v_election.start_datetime then
    return 'not_started';
  end if;

  if now() >= v_election.start_datetime and now() <= v_election.end_datetime then
    return 'open';
  end if;

  return 'closed';
end;
$$;

create or replace function public.is_voter_registered_for_election(
  p_election_id uuid,
  p_voter_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.voter_registrations vr
    where vr.election_id = p_election_id
      and vr.voter_id = p_voter_id
      and vr.status in ('Registered', 'Approved')
  );
$$;

create or replace function public.get_votable_elections_for_voter()
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
      select jsonb_agg(row_data order by (row_data->>'start_datetime') desc)
      from (
        select jsonb_build_object(
          'id',
          e.id,
          'title',
          e.title,
          'description',
          e.description,
          'start_datetime',
          e.start_datetime,
          'end_datetime',
          e.end_datetime,
          'status',
          e.status,
          'registration_status',
          e.registration_status,
          'phase',
          public.get_voting_phase(e.id),
          'polls',
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'id',
                  p.id,
                  'title',
                  p.title,
                  'has_voted',
                  exists (
                    select 1
                    from public.voter_vote_status vvs
                    where vvs.voter_id = v_user_id
                      and vvs.poll_id = p.id
                      and vvs.has_voted = true
                  ),
                  'has_secret_id',
                  exists (
                    select 1
                    from public.secret_ids s
                    where s.voter_id = v_user_id
                      and s.poll_id = p.id
                      and s.is_active = true
                      and s.used_at is null
                  )
                )
                order by p.created_at asc, p.id asc
              )
              from public.polls p
              where p.election_id = e.id
                and coalesce(p.is_staging, false) = false
            ),
            '[]'::jsonb
          )
        ) as row_data
        from public.elections e
        where e.status <> 'Draft'
          and public.is_voter_registered_for_election(e.id, v_user_id)
      ) sub
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_voting_phase(uuid) to authenticated;
grant execute on function public.is_voter_registered_for_election(uuid, uuid) to authenticated;
grant execute on function public.get_votable_elections_for_voter() to authenticated;
