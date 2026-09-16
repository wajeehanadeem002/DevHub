-- DevHub profile management boundary.
-- Adds an atomic owner-scoped profile update and the public avatar bucket.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "DevHub users upload own avatars"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

create policy "DevHub users delete own avatars"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  and owner_id = (select auth.jwt() ->> 'sub')
);

create or replace function public.update_current_profile(
  p_username text,
  p_display_name text,
  p_headline text,
  p_bio text,
  p_location text,
  p_website_url text,
  p_github_url text,
  p_linkedin_url text,
  p_is_public boolean,
  p_technology_ids smallint[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id text := auth.jwt() ->> 'sub';
  technology_ids smallint[] := coalesce(
    p_technology_ids,
    array[]::smallint[]
  );
  technology_count integer;
begin
  if current_user_id is null or current_user_id = '' then
    raise insufficient_privilege using
      message = 'An authenticated Clerk subject is required.';
  end if;

  technology_count := cardinality(technology_ids);

  if technology_count > 8 then
    raise invalid_parameter_value using
      message = 'Choose no more than eight technologies.';
  end if;

  if (
    select count(distinct selected_id)
    from unnest(technology_ids) as selected(selected_id)
  ) <> technology_count then
    raise invalid_parameter_value using
      message = 'Technology selections must be unique.';
  end if;

  if exists (
    select 1
    from unnest(technology_ids) as selected(selected_id)
    left join public.technologies
      on technologies.id = selected.selected_id
    where technologies.id is null
  ) then
    raise invalid_parameter_value using
      message = 'Every selected technology must be curated.';
  end if;

  update public.profiles
  set
    username = p_username,
    display_name = p_display_name,
    headline = p_headline,
    bio = p_bio,
    location = p_location,
    website_url = p_website_url,
    github_url = p_github_url,
    linkedin_url = p_linkedin_url,
    is_public = p_is_public
  where user_id = current_user_id
    and deleted_at is null;

  if not found then
    raise no_data_found using
      message = 'The current developer profile does not exist.';
  end if;

  delete from public.profile_technologies
  where user_id = current_user_id;

  insert into public.profile_technologies (technology_id)
  select selected_id
  from unnest(technology_ids) as selected(selected_id);
end;
$$;

revoke all on function public.update_current_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  smallint[]
) from public, anon;

grant execute on function public.update_current_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  smallint[]
) to authenticated;

comment on function public.update_current_profile(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  smallint[]
) is 'Atomically updates the current Clerk-owned profile and its curated technologies.';
