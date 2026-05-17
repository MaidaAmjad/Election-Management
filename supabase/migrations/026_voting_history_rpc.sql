-- =============================================================================
-- Voting history RPC (from 013). Run after 025_voter_vote_status.sql.
-- =============================================================================

alter table public.polls
  add column if not exists is_staging boolean not null default false;

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
        and coalesce(p.is_staging, false) = false
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_my_voting_history() to authenticated;
