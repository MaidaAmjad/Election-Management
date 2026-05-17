-- =============================================================================
-- Candidates scoped to polls (one candidate → one poll → one election)
-- =============================================================================

alter table public.candidates
  add column if not exists poll_id uuid references public.polls (id) on delete cascade;

create index if not exists candidates_poll_id_idx on public.candidates (poll_id);

-- Backfill: assign each legacy candidate to the earliest poll in its election
update public.candidates c
set poll_id = sub.poll_id
from (
  select distinct on (c2.id)
    c2.id as candidate_id,
    p.id as poll_id
  from public.candidates c2
  join public.polls p on p.election_id = c2.election_id
  where c2.poll_id is null
  order by c2.id, p.created_at asc
) sub
where c.id = sub.candidate_id and c.poll_id is null;

delete from public.candidates where poll_id is null;

alter table public.candidates
  alter column poll_id set not null;

create or replace function public.enforce_candidate_poll_election_match()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.polls p
    where p.id = new.poll_id and p.election_id = new.election_id
  ) then
    raise exception 'Candidate poll must belong to the same election.';
  end if;
  return new;
end;
$$;

drop trigger if exists candidates_poll_election_match on public.candidates;
create trigger candidates_poll_election_match
  before insert or update on public.candidates
  for each row execute function public.enforce_candidate_poll_election_match();

-- ---------------------------------------------------------------------------
-- RLS: draft-only writes; published read for all
-- ---------------------------------------------------------------------------

drop policy if exists "Creators can insert own candidates" on public.candidates;
drop policy if exists "Creators can view own candidates" on public.candidates;
drop policy if exists "Creators can update own candidates" on public.candidates;
drop policy if exists "Creators can delete own candidates" on public.candidates;
drop policy if exists "Public can view candidates for published elections" on public.candidates;

create policy "View candidates for published elections or own drafts"
  on public.candidates for select to authenticated
  using (
    exists (
      select 1 from public.elections e
      where e.id = candidates.election_id
        and (
          e.status <> 'Draft'
          or e.creator_id = auth.uid()
        )
    )
  );

create policy "Public can view candidates for published elections"
  on public.candidates for select
  using (
    exists (
      select 1 from public.elections e
      where e.id = candidates.election_id and e.status <> 'Draft'
    )
  );

create policy "Creators insert candidates for draft elections"
  on public.candidates for insert to authenticated
  with check (
    creator_id = auth.uid()
    and exists (
      select 1
      from public.elections e
      join public.polls p on p.election_id = e.id
      where e.id = election_id
        and e.creator_id = auth.uid()
        and e.status = 'Draft'
        and p.id = poll_id
    )
  );

create policy "Creators update candidates before publish"
  on public.candidates for update to authenticated
  using (
    creator_id = auth.uid()
    and exists (
      select 1 from public.elections e
      where e.id = candidates.election_id
        and e.creator_id = auth.uid()
        and e.status = 'Draft'
    )
  )
  with check (
    creator_id = auth.uid()
    and exists (
      select 1
      from public.elections e
      join public.polls p on p.election_id = e.id
      where e.id = election_id
        and e.creator_id = auth.uid()
        and e.status = 'Draft'
        and p.id = poll_id
    )
  );

create policy "Creators delete candidates before publish"
  on public.candidates for delete to authenticated
  using (
    creator_id = auth.uid()
    and exists (
      select 1 from public.elections e
      where e.id = candidates.election_id
        and e.creator_id = auth.uid()
        and e.status = 'Draft'
    )
  );

-- Voting: candidate must belong to the poll being voted on
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
    where c.id = p_candidate_id
      and c.poll_id = p_poll_id
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
    'Vote recorded successfully'
  );
end;
$$;

-- Ballot: only candidates for the selected poll
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
        where c.poll_id = p_poll_id
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
