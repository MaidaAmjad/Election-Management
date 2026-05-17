-- =============================================================================
-- Secure anonymous voting (secret ID gate, one vote per poll)
-- =============================================================================

alter table public.secret_ids
  add column if not exists used_at timestamptz,
  add column if not exists expires_at timestamptz;

-- Anonymous ballot: no voter_id column
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint votes_poll_candidate_check check (true)
);

create index if not exists votes_poll_id_idx on public.votes (poll_id);
create index if not exists votes_candidate_id_idx on public.votes (candidate_id);
create index if not exists votes_created_at_idx on public.votes (created_at desc);

create table if not exists public.voter_vote_status (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references auth.users (id) on delete cascade,
  poll_id uuid not null references public.polls (id) on delete cascade,
  has_voted boolean not null default false,
  voted_at timestamptz,
  constraint voter_vote_status_unique unique (voter_id, poll_id)
);

create index if not exists voter_vote_status_voter_id_idx
  on public.voter_vote_status (voter_id);
create index if not exists voter_vote_status_poll_id_idx
  on public.voter_vote_status (poll_id);

alter table public.votes enable row level security;
alter table public.voter_vote_status enable row level security;

-- ---------------------------------------------------------------------------
-- Aggregated counts (safe for realtime; no voter identity)
-- ---------------------------------------------------------------------------

create or replace view public.poll_vote_counts
with (security_invoker = true)
as
select
  v.poll_id,
  v.candidate_id,
  count(*)::bigint as vote_count
from public.votes v
group by v.poll_id, v.candidate_id;

grant select on public.poll_vote_counts to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Lifecycle helpers
-- ---------------------------------------------------------------------------

create or replace function public.sync_election_status(p_election_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
  v_new_status text;
begin
  select * into v_election from public.elections where id = p_election_id;
  if not found then
    return null;
  end if;

  if v_election.status = 'Draft' then
    return v_election.status;
  end if;

  if now() > v_election.end_datetime then
    v_new_status := 'Completed';
  elsif now() >= v_election.start_datetime and now() <= v_election.end_datetime then
    v_new_status := 'Active';
  else
    v_new_status := v_election.status;
    if v_election.status = 'Completed' then
      return 'Completed';
    end if;
    return coalesce(v_election.status, 'Published');
  end if;

  if v_election.status is distinct from v_new_status then
    update public.elections
    set status = v_new_status
    where id = p_election_id;
  end if;

  return v_new_status;
end;
$$;

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
  perform public.sync_election_status(p_election_id);

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

-- Backfill secret ID expiry from election end
update public.secret_ids s
set expires_at = e.end_datetime
from public.elections e
where e.id = s.election_id
  and s.expires_at is null;

-- Set expiry on new secret IDs
create or replace function public.secret_ids_set_expiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.expires_at is null then
    select e.end_datetime into new.expires_at
    from public.elections e
    where e.id = new.election_id;
  end if;
  return new;
end;
$$;

drop trigger if exists secret_ids_set_expiry_trigger on public.secret_ids;
create trigger secret_ids_set_expiry_trigger
  before insert on public.secret_ids
  for each row
  execute function public.secret_ids_set_expiry();

-- ---------------------------------------------------------------------------
-- Validate secret ID (no vote cast)
-- ---------------------------------------------------------------------------

create or replace function public.validate_secret_id_for_voting(
  p_secret_id_text text,
  p_poll_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.secret_ids%rowtype;
  v_phase text;
begin
  if v_user_id is null then
    return jsonb_build_object('valid', false, 'message', 'Authentication required.');
  end if;

  if p_secret_id_text is null or trim(p_secret_id_text) = '' then
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  select * into v_row
  from public.secret_ids s
  where upper(trim(s.secret_id)) = upper(trim(p_secret_id_text))
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  if v_row.poll_id is distinct from p_poll_id then
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  if v_row.voter_id is distinct from v_user_id then
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  if v_row.is_active is not true then
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  if v_row.used_at is not null then
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  v_phase := public.get_voting_phase(v_row.election_id);

  if v_phase = 'not_started' then
    return jsonb_build_object('valid', false, 'message', 'Voting has not started yet');
  end if;

  if v_phase <> 'open' then
    return jsonb_build_object(
      'valid',
      false,
      'message',
      case when v_phase = 'closed' then 'Election has ended' else 'Voting Closed' end
    );
  end if;

  if v_row.expires_at is not null and now() > v_row.expires_at then
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  if not public.is_voter_registered_for_election(v_row.election_id, v_user_id) then
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  if exists (
    select 1
    from public.voter_vote_status vvs
    where vvs.voter_id = v_user_id
      and vvs.poll_id = p_poll_id
      and vvs.has_voted = true
  ) then
    return jsonb_build_object('valid', false, 'message', 'You have already voted');
  end if;

  return jsonb_build_object(
    'valid',
    true,
    'secret_row_id',
    v_row.id,
    'election_id',
    v_row.election_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cast anonymous vote
-- ---------------------------------------------------------------------------

create or replace function public.cast_anonymous_vote(
  p_secret_id_text text,
  p_poll_id uuid,
  p_candidate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_validation jsonb;
  v_row public.secret_ids%rowtype;
  v_election_id uuid;
  v_phase text;
  v_rows integer;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  v_validation := public.validate_secret_id_for_voting(p_secret_id_text, p_poll_id);

  if coalesce((v_validation->>'valid')::boolean, false) is not true then
    return jsonb_build_object(
      'success',
      false,
      'message',
      coalesce(v_validation->>'message', 'Invalid Secret ID')
    );
  end if;

  select * into v_row
  from public.secret_ids s
  where s.id = (v_validation->>'secret_row_id')::uuid
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Invalid Secret ID');
  end if;

  v_election_id := v_row.election_id;
  v_phase := public.get_voting_phase(v_election_id);

  if v_phase <> 'open' then
    return jsonb_build_object(
      'success',
      false,
      'message',
      case
        when v_phase = 'not_started' then 'Voting has not started yet'
        when v_phase = 'closed' then 'Election has ended'
        else 'Voting Closed'
      end
    );
  end if;

  if not exists (
    select 1
    from public.candidates c
    join public.polls p on p.election_id = c.election_id
    where c.id = p_candidate_id
      and p.id = p_poll_id
  ) then
    return jsonb_build_object('success', false, 'message', 'Invalid candidate for this poll.');
  end if;

  if exists (
    select 1
    from public.voter_vote_status vvs
    where vvs.voter_id = v_user_id
      and vvs.poll_id = p_poll_id
      and vvs.has_voted = true
  ) then
    return jsonb_build_object('success', false, 'message', 'You have already voted');
  end if;

  insert into public.voter_vote_status (voter_id, poll_id, has_voted, voted_at)
  values (v_user_id, p_poll_id, true, now())
  on conflict (voter_id, poll_id)
  do update set
    has_voted = true,
    voted_at = coalesce(public.voter_vote_status.voted_at, excluded.voted_at)
  where public.voter_vote_status.has_voted is not true;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return jsonb_build_object('success', false, 'message', 'You have already voted');
  end if;

  insert into public.votes (poll_id, candidate_id)
  values (p_poll_id, p_candidate_id);

  update public.secret_ids
  set
    used_at = now(),
    is_active = false
  where id = v_row.id
    and used_at is null;

  return jsonb_build_object(
    'success',
    true,
    'message',
    'Your vote has been submitted successfully.'
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'message', 'You have already voted');
end;
$$;

-- ---------------------------------------------------------------------------
-- Voter ballot & history reads
-- ---------------------------------------------------------------------------

create or replace function public.get_voting_ballot(p_poll_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_poll public.polls%rowtype;
  v_election public.elections%rowtype;
  v_phase text;
  v_has_voted boolean := false;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  select * into v_poll from public.polls where id = p_poll_id;
  if not found then
    return jsonb_build_object('success', false, 'message', 'Poll not found.');
  end if;

  select * into v_election from public.elections where id = v_poll.election_id;
  v_phase := public.get_voting_phase(v_election.id);

  select coalesce(vvs.has_voted, false) into v_has_voted
  from public.voter_vote_status vvs
  where vvs.voter_id = v_user_id
    and vvs.poll_id = p_poll_id;

  return jsonb_build_object(
    'success',
    true,
    'phase',
    v_phase,
    'has_voted',
    v_has_voted,
    'election',
    jsonb_build_object(
      'id',
      v_election.id,
      'title',
      v_election.title,
      'start_datetime',
      v_election.start_datetime,
      'end_datetime',
      v_election.end_datetime,
      'status',
      v_election.status,
      'registration_status',
      v_election.registration_status
    ),
    'poll',
    jsonb_build_object(
      'id',
      v_poll.id,
      'title',
      v_poll.title,
      'description',
      v_poll.description
    ),
    'candidates',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',
            c.id,
            'name',
            c.name,
            'designation',
            c.designation,
            'manifesto',
            c.manifesto,
            'photo_url',
            c.photo_url
          )
          order by c.created_at asc
        )
        from public.candidates c
        where c.election_id = v_election.id
      ),
      '[]'::jsonb
    ),
    'vote_counts',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'candidate_id',
            pvc.candidate_id,
            'vote_count',
            pvc.vote_count
          )
        )
        from public.poll_vote_counts pvc
        where pvc.poll_id = p_poll_id
      ),
      '[]'::jsonb
    ),
    'participation',
    jsonb_build_object(
      'votes_cast',
      (
        select count(*)::integer
        from public.voter_vote_status vvs2
        join public.polls p2 on p2.id = vvs2.poll_id
        where p2.election_id = v_election.id
          and vvs2.has_voted = true
      ),
      'registered_voters',
      (
        select count(*)::integer
        from public.voter_registrations vr
        where vr.election_id = v_election.id
          and vr.status in ('Registered', 'Approved')
      )
    )
  );
end;
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
                order by p.created_at asc
              )
              from public.polls p
              where p.election_id = e.id
            ),
            '[]'::jsonb
          )
        ) as row_data
        from public.elections e
        where e.status <> 'Draft'
          and public.is_voter_registered_for_election(e.id, v_user_id)
          and coalesce(e.registration_status, '') = 'Finalized'
      ) sub
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_my_voting_history()
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
      select jsonb_agg(
        jsonb_build_object(
          'id',
          vvs.id,
          'election_id',
          e.id,
          'election_title',
          e.title,
          'poll_id',
          p.id,
          'poll_title',
          p.title,
          'voted_at',
          vvs.voted_at,
          'status',
          case
            when vvs.has_voted then 'Voted'
            else 'Not voted'
          end
        )
        order by vvs.voted_at desc nulls last
      )
      from public.voter_vote_status vvs
      join public.polls p on p.id = vvs.poll_id
      join public.elections e on e.id = p.election_id
      where vvs.voter_id = v_user_id
        and vvs.has_voted = true
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_poll_vote_counts(p_poll_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'candidate_id',
          pvc.candidate_id,
          'vote_count',
          pvc.vote_count
        )
      )
      from public.poll_vote_counts pvc
      where pvc.poll_id = p_poll_id
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_election_vote_statistics(p_election_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.is_super_admin()
    or public.is_election_creator(p_election_id)
  ) then
    return jsonb_build_object('success', false, 'message', 'Access denied.');
  end if;

  return jsonb_build_object(
    'success',
    true,
    'polls',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'poll_id',
            p.id,
            'poll_title',
            p.title,
            'total_votes',
            (
              select count(*)::integer
              from public.votes v
              where v.poll_id = p.id
            ),
            'candidates',
            coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'candidate_id',
                    pvc.candidate_id,
                    'vote_count',
                    pvc.vote_count
                  )
                )
                from public.poll_vote_counts pvc
                where pvc.poll_id = p.id
              ),
              '[]'::jsonb
            )
          )
          order by p.created_at asc
        )
        from public.polls p
        where p.election_id = p_election_id
      ),
      '[]'::jsonb
    ),
    'participation',
    jsonb_build_object(
      'registered_voters',
      (
        select count(*)::integer
        from public.voter_registrations vr
        where vr.election_id = p_election_id
          and vr.status in ('Registered', 'Approved')
      ),
      'votes_cast',
      (
        select count(*)::integer
        from public.voter_vote_status vvs
        join public.polls p2 on p2.id = vvs.poll_id
        where p2.election_id = p_election_id
          and vvs.has_voted = true
      )
    )
  );
end;
$$;

grant execute on function public.sync_election_status(uuid) to authenticated;
grant execute on function public.get_voting_phase(uuid) to authenticated;
grant execute on function public.validate_secret_id_for_voting(text, uuid) to authenticated;
grant execute on function public.cast_anonymous_vote(text, uuid, uuid) to authenticated;
grant execute on function public.get_voting_ballot(uuid) to authenticated;
grant execute on function public.get_votable_elections_for_voter() to authenticated;
grant execute on function public.get_my_voting_history() to authenticated;
grant execute on function public.get_poll_vote_counts(uuid) to authenticated;
grant execute on function public.get_election_vote_statistics(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

drop policy if exists "No direct vote reads" on public.votes;
create policy "No direct vote reads"
  on public.votes for select to authenticated
  using (false);

drop policy if exists "No direct vote inserts" on public.votes;
create policy "No direct vote inserts"
  on public.votes for insert to authenticated
  with check (false);

drop policy if exists "Voters view own vote status" on public.voter_vote_status;
create policy "Voters view own vote status"
  on public.voter_vote_status for select to authenticated
  using (voter_id = auth.uid());

drop policy if exists "No direct vote status writes" on public.voter_vote_status;
create policy "No direct vote status writes"
  on public.voter_vote_status for insert to authenticated
  with check (false);

drop policy if exists "Managers view vote status counts" on public.voter_vote_status;
create policy "Managers view vote status counts"
  on public.voter_vote_status for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1
      from public.polls p
      where p.id = voter_vote_status.poll_id
        and public.is_election_creator(p.election_id)
    )
  );

-- Voters may read candidates for elections they joined
drop policy if exists "Voters view candidates for joined elections" on public.candidates;
create policy "Voters view candidates for joined elections"
  on public.candidates for select to authenticated
  using (
    exists (
      select 1
      from public.voter_registrations vr
      where vr.election_id = candidates.election_id
        and vr.voter_id = auth.uid()
        and vr.status in ('Registered', 'Approved')
    )
  );

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.votes;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.voter_vote_status;
exception
  when duplicate_object then null;
end $$;
