-- Poll options: candidates selected per poll (pool stays on staging poll).
-- allow_multiple_answers + is_staging on polls.

alter table public.polls
  add column if not exists allow_multiple_answers boolean not null default false;

alter table public.polls
  add column if not exists is_staging boolean not null default false;

update public.polls
set is_staging = true
where is_staging is not true
  and title = 'Ballot 1'
  and description ilike '%Primary ballot%';

create table if not exists public.poll_options (
  poll_id uuid not null references public.polls (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, candidate_id)
);

create index if not exists poll_options_poll_id_idx on public.poll_options (poll_id);
create index if not exists poll_options_candidate_id_idx on public.poll_options (candidate_id);

alter table public.poll_options enable row level security;

drop policy if exists "Poll options via election creator" on public.poll_options;
create policy "Poll options via election creator"
  on public.poll_options for all to authenticated
  using (
    exists (
      select 1
      from public.polls p
      join public.elections e on e.id = p.election_id
      where p.id = poll_options.poll_id
        and e.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.polls p
      join public.elections e on e.id = p.election_id
      join public.candidates c on c.id = poll_options.candidate_id
      where p.id = poll_options.poll_id
        and e.creator_id = auth.uid()
        and c.election_id = e.id
    )
  );

drop policy if exists "Public read poll options for published elections" on public.poll_options;
create policy "Public read poll options for published elections"
  on public.poll_options for select
  using (
    exists (
      select 1
      from public.polls p
      join public.elections e on e.id = p.election_id
      where p.id = poll_options.poll_id
        and e.status <> 'Draft'
    )
  );

create or replace function public.candidate_is_on_poll(p_poll_id uuid, p_candidate_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.poll_options po
    where po.poll_id = p_poll_id
      and po.candidate_id = p_candidate_id
  )
  or exists (
    select 1
    from public.candidates c
    where c.id = p_candidate_id
      and c.poll_id = p_poll_id
      and not exists (
        select 1 from public.poll_options po2 where po2.poll_id = p_poll_id
      )
  );
$$;

-- Ballot: candidates linked via poll_options (or legacy poll_id)
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

  if coalesce(v_poll.is_staging, false) then
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
      v_poll.description,
      'allow_multiple_answers',
      coalesce(v_poll.allow_multiple_answers, false)
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
        where public.candidate_is_on_poll(p_poll_id, c.id)
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
    )
  );
end;
$$;

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

  if not public.candidate_is_on_poll(p_poll_id, p_candidate_id) then
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

grant execute on function public.candidate_is_on_poll(uuid, uuid) to authenticated, anon;
