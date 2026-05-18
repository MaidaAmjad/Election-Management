-- Fix: aggregate function calls cannot contain window function calls
-- in get_vote_trend_for_election (used by get_live_election_results).

create or replace function public.get_vote_trend_for_election(
  p_election_id uuid,
  p_poll_id uuid default null
)
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
          'bucket', t.bucket,
          'vote_count', t.vote_count,
          'cumulative', t.cumulative
        )
        order by t.bucket
      )
      from (
        select
          b.bucket,
          b.vote_count,
          sum(b.vote_count) over (order by b.bucket) as cumulative
        from (
          select
            date_trunc('hour', v.created_at) as bucket,
            count(*)::integer as vote_count
          from public.votes v
          join public.polls p on p.id = v.poll_id
          where p.election_id = p_election_id
            and coalesce(p.is_staging, false) = false
            and (p_poll_id is null or v.poll_id = p_poll_id)
          group by date_trunc('hour', v.created_at)
        ) b
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_vote_trend_for_election(uuid, uuid) to authenticated;
