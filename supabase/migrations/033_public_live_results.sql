-- =============================================================================
-- Public live results for landing page (anon + authenticated)
-- =============================================================================

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
          r.rank
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
          )::integer as rank
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

create or replace function public.get_public_live_results(p_election_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_election_ids is null or cardinality(p_election_ids) = 0 then
    return jsonb_build_object('success', true, 'elections', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'success',
    true,
    'elections',
    coalesce(
      (
        select jsonb_agg(e_row order by e_row->>'title')
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
            'start_datetime',
            e.start_datetime,
            'end_datetime',
            e.end_datetime,
            'polls',
            (
              select coalesce(
                jsonb_agg(
                  jsonb_build_object(
                    'id',
                    p.id,
                    'title',
                    p.title,
                    'total_votes',
                    (
                      select count(*)::bigint
                      from public.votes v
                      where v.poll_id = p.id
                    ),
                    'candidates',
                    public.get_ranked_candidates_for_poll(p.id)
                  )
                  order by p.created_at asc, p.id asc
                ),
                '[]'::jsonb
              )
              from public.polls p
              where p.election_id = e.id
                and coalesce(p.is_staging, false) = false
            )
          ) as e_row
          from public.elections e
          where e.id = any (p_election_ids)
            and e.approval_status = 'Approved'
            and e.status <> 'Draft'
        ) sub
      ),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.get_ranked_candidates_for_poll(uuid) to authenticated, anon;
grant execute on function public.get_public_live_results(uuid[]) to authenticated, anon;
