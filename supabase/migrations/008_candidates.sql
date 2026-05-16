-- =============================================================================
-- Election candidates (creator-managed) + candidate-images storage
-- =============================================================================

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  creator_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  designation text not null,
  manifesto text not null,
  photo_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists candidates_election_id_idx on public.candidates (election_id);
create index if not exists candidates_creator_id_idx on public.candidates (creator_id);
create index if not exists candidates_created_at_idx on public.candidates (created_at desc);

alter table public.candidates enable row level security;

drop policy if exists "Creators can insert own candidates" on public.candidates;
create policy "Creators can insert own candidates"
  on public.candidates for insert to authenticated
  with check (
    creator_id = auth.uid()
    and exists (
      select 1 from public.elections e
      where e.id = election_id and e.creator_id = auth.uid()
    )
  );

drop policy if exists "Creators can view own candidates" on public.candidates;
create policy "Creators can view own candidates"
  on public.candidates for select to authenticated
  using (creator_id = auth.uid());

drop policy if exists "Creators can update own candidates" on public.candidates;
create policy "Creators can update own candidates"
  on public.candidates for update to authenticated
  using (creator_id = auth.uid())
  with check (
    creator_id = auth.uid()
    and exists (
      select 1 from public.elections e
      where e.id = election_id and e.creator_id = auth.uid()
    )
  );

drop policy if exists "Creators can delete own candidates" on public.candidates;
create policy "Creators can delete own candidates"
  on public.candidates for delete to authenticated
  using (creator_id = auth.uid());

drop policy if exists "Public can view candidates for published elections" on public.candidates;
create policy "Public can view candidates for published elections"
  on public.candidates for select
  using (
    exists (
      select 1 from public.elections e
      where e.id = candidates.election_id and e.status <> 'Draft'
    )
  );

-- Storage bucket: candidate-images (public read, creator-scoped write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidate-images',
  'candidate-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read candidate images" on storage.objects;
create policy "Public read candidate images"
  on storage.objects for select
  using (bucket_id = 'candidate-images');

drop policy if exists "Creators upload candidate images" on storage.objects;
create policy "Creators upload candidate images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'candidate-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

drop policy if exists "Creators update candidate images" on storage.objects;
create policy "Creators update candidate images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'candidate-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

drop policy if exists "Creators delete candidate images" on storage.objects;
create policy "Creators delete candidate images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'candidate-images'
    and (storage.foldername (name))[1] = auth.uid()::text
  );
