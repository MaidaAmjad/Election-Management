-- =============================================================================
-- Link existing votes to used secret IDs (votes cast before migration 039).
-- Matches by poll: nth vote by created_at ↔ nth used secret by used_at.
-- =============================================================================

with unmatched_votes as (
  select
    v.id as vote_id,
    v.poll_id,
    row_number() over (
      partition by v.poll_id
      order by v.created_at asc, v.id asc
    ) as rn
  from public.votes v
  where v.secret_id_row_id is null
),
unmatched_secrets as (
  select
    s.id as secret_id,
    s.poll_id,
    row_number() over (
      partition by s.poll_id
      order by s.used_at asc nulls last, s.id asc
    ) as rn
  from public.secret_ids s
  where s.used_at is not null
    and not exists (
      select 1
      from public.votes v2
      where v2.secret_id_row_id = s.id
    )
),
pairs as (
  select uv.vote_id, us.secret_id
  from unmatched_votes uv
  inner join unmatched_secrets us
    on us.poll_id = uv.poll_id
    and us.rn = uv.rn
)
update public.votes v
set secret_id_row_id = p.secret_id
from pairs p
where v.id = p.vote_id
  and v.secret_id_row_id is null;
