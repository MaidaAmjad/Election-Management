-- =============================================================================
-- Link votes to secret ID rows and expose masked voter IDs per candidate in results.
-- =============================================================================

alter table public.votes
  add column if not exists secret_id_row_id uuid references public.secret_ids (id) on delete set null;

create unique index if not exists votes_secret_id_row_id_unique
  on public.votes (secret_id_row_id)
  where secret_id_row_id is not null;

create index if not exists votes_secret_id_row_id_idx
  on public.votes (secret_id_row_id)
  where secret_id_row_id is not null;

-- Record which secret ID cast each vote (new votes only).
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

  insert into public.votes (poll_id, candidate_id, secret_id_row_id)
  values (p_poll_id, p_candidate_id, v_row.id);

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

-- Masked secret IDs per candidate for a poll (public + live results).
create or replace function public.get_ranked_candidates_for_poll(p_poll_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_election_id uuid;
  v_total bigint;
begin
  select p.election_id into v_election_id
  from public.polls p
  where p.id = p_poll_id;

  if v_election_id is null then
    return '[]'::jsonb;
  end if;

  if not exists (
    select 1
    from public.elections e
    where e.id = v_election_id
      and e.approval_status = 'Approved'
      and e.status <> 'Draft'
  ) then
    return '[]'::jsonb;
  end if;

  select coalesce(sum(cnt), 0) into v_total
  from (
    select count(*)::bigint as cnt
    from public.votes v
    where v.poll_id = p_poll_id
    group by v.candidate_id
  ) sub;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',
          r.id,
          'name',
          r.name,
          'designation',
          r.designation,
          'photo_url',
          r.photo_url,
          'vote_count',
          r.vote_count,
          'vote_percentage',
          r.vote_percentage,
          'rank',
          r.rank,
          'masked_voter_ids',
          r.masked_voter_ids
        )
        order by r.rank asc
      )
      from (
        select
          c.id,
          c.name,
          c.designation,
          c.photo_url,
          coalesce(vc.cnt, 0)::bigint as vote_count,
          case
            when v_total > 0 then
              round((coalesce(vc.cnt, 0)::numeric / v_total::numeric) * 100, 2)
            else 0
          end as vote_percentage,
          row_number() over (
            order by coalesce(vc.cnt, 0) desc, c.name asc
          )::integer as rank,
          coalesce(
            (
              select jsonb_agg(m.masked_id order by m.masked_id)
              from (
                select distinct public.mask_secret_id(s.secret_id) as masked_id
                from public.votes v
                inner join public.secret_ids s on s.id = v.secret_id_row_id
                where v.poll_id = p_poll_id
                  and v.candidate_id = c.id
              ) m
            ),
            '[]'::jsonb
          ) as masked_voter_ids
        from public.candidates c
        inner join (
          select po.candidate_id
          from public.poll_options po
          where po.poll_id = p_poll_id
          union
          select c2.id
          from public.candidates c2
          where c2.poll_id = p_poll_id
        ) poll_cands on poll_cands.candidate_id = c.id
        left join (
          select v.candidate_id, count(*)::bigint as cnt
          from public.votes v
          where v.poll_id = p_poll_id
          group by v.candidate_id
        ) vc on vc.candidate_id = c.id
        where c.election_id = v_election_id
      ) r
    ),
    '[]'::jsonb
  );
end;
$$;

-- Per-poll branch in election results (creator live dashboard).
create or replace function public.get_ranked_candidates_for_election(
  p_election_id uuid,
  p_poll_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  if p_poll_id is not null then
    return public.get_ranked_candidates_for_poll(p_poll_id);
  end if;

  select coalesce(sum(cnt), 0) into v_total
  from (
    select count(*)::bigint as cnt
    from public.votes v
    join public.polls p on p.id = v.poll_id
    where p.election_id = p_election_id
      and coalesce(p.is_staging, false) = false
    group by v.candidate_id
  ) sub;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',
          r.id,
          'name',
          r.name,
          'designation',
          r.designation,
          'photo_url',
          r.photo_url,
          'manifesto',
          r.manifesto,
          'vote_count',
          r.vote_count,
          'vote_percentage',
          r.vote_percentage,
          'rank',
          r.rank,
          'masked_voter_ids',
          '[]'::jsonb
        )
        order by r.rank asc
      )
      from (
        select
          c.id,
          c.name,
          c.designation,
          c.photo_url,
          left(c.manifesto, 200) as manifesto,
          coalesce(vc.cnt, 0)::bigint as vote_count,
          case
            when v_total > 0 then
              round((coalesce(vc.cnt, 0)::numeric / v_total::numeric) * 100, 2)
            else 0
          end as vote_percentage,
          row_number() over (
            order by coalesce(vc.cnt, 0) desc, c.name asc
          )::integer as rank
        from public.candidates c
        left join (
          select v.candidate_id, count(*)::bigint as cnt
          from public.votes v
          join public.polls p on p.id = v.poll_id
          where p.election_id = p_election_id
            and coalesce(p.is_staging, false) = false
          group by v.candidate_id
        ) vc on vc.candidate_id = c.id
        where c.election_id = p_election_id
      ) r
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.mask_secret_id(text) to authenticated, anon;
