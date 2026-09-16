-- DevHub project management and image Storage boundary.
-- Clerk remains the identity provider; RLS remains the authorization boundary.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'project-images',
  'project-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "DevHub owners upload project images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.owner_id = (select auth.jwt() ->> 'sub')
  )
);

create policy "DevHub owners delete project images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-images'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
  and owner_id = (select auth.jwt() ->> 'sub')
);

alter table public.project_images
  drop constraint project_images_project_order_unique;

alter table public.project_images
  add constraint project_images_project_order_unique
  unique (project_id, sort_order)
  deferrable initially immediate;

create or replace function public.create_current_project(
  p_category_id smallint,
  p_title text,
  p_summary text,
  p_description text,
  p_demo_url text,
  p_repository_url text,
  p_technology_ids smallint[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id text := (select auth.jwt() ->> 'sub');
  technology_ids smallint[] := coalesce(
    p_technology_ids,
    array[]::smallint[]
  );
  technology_count integer;
  new_project_id uuid;
begin
  if current_user_id is null or current_user_id = '' then
    raise insufficient_privilege using
      message = 'An authenticated Clerk subject is required.';
  end if;

  if not exists (
    select 1
    from public.categories
    where categories.id = p_category_id
  ) then
    raise invalid_parameter_value using
      message = 'Choose a curated project category.';
  end if;

  technology_count := cardinality(technology_ids);

  if technology_count < 1 or technology_count > 8 then
    raise invalid_parameter_value using
      message = 'Choose between one and eight technologies.';
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

  insert into public.projects (
    category_id,
    title,
    summary,
    description,
    demo_url,
    repository_url,
    status
  )
  values (
    p_category_id,
    p_title,
    p_summary,
    p_description,
    p_demo_url,
    p_repository_url,
    'draft'
  )
  returning id into new_project_id;

  insert into public.project_technologies (project_id, technology_id)
  select new_project_id, selected_id
  from unnest(technology_ids) as selected(selected_id);

  return new_project_id;
end;
$$;

create or replace function public.update_current_project(
  p_project_id uuid,
  p_category_id smallint,
  p_title text,
  p_summary text,
  p_description text,
  p_demo_url text,
  p_repository_url text,
  p_status text,
  p_technology_ids smallint[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id text := (select auth.jwt() ->> 'sub');
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

  perform 1
  from public.projects
  where projects.id = p_project_id
    and projects.owner_id = current_user_id
  for update;

  if not found then
    raise no_data_found using
      message = 'The current developer does not own this project.';
  end if;

  if not exists (
    select 1
    from public.categories
    where categories.id = p_category_id
  ) then
    raise invalid_parameter_value using
      message = 'Choose a curated project category.';
  end if;

  if p_status is null or p_status not in ('draft', 'published') then
    raise invalid_parameter_value using
      message = 'Project status must be draft or published.';
  end if;

  technology_count := cardinality(technology_ids);

  if technology_count < 1 or technology_count > 8 then
    raise invalid_parameter_value using
      message = 'Choose between one and eight technologies.';
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

  update public.projects
  set
    category_id = p_category_id,
    title = p_title,
    summary = p_summary,
    description = p_description,
    demo_url = p_demo_url,
    repository_url = p_repository_url,
    status = p_status
  where id = p_project_id
    and owner_id = current_user_id;

  delete from public.project_technologies
  where project_id = p_project_id;

  insert into public.project_technologies (project_id, technology_id)
  select p_project_id, selected_id
  from unnest(technology_ids) as selected(selected_id);
end;
$$;

create or replace function public.add_current_project_image(
  p_project_id uuid,
  p_storage_path text,
  p_alt_text text,
  p_mime_type text,
  p_byte_size integer,
  p_width integer,
  p_height integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id text := (select auth.jwt() ->> 'sub');
  image_count integer;
  next_sort_order smallint;
  new_image_id uuid;
begin
  if current_user_id is null or current_user_id = '' then
    raise insufficient_privilege using
      message = 'An authenticated Clerk subject is required.';
  end if;

  perform 1
  from public.projects
  where projects.id = p_project_id
    and projects.owner_id = current_user_id
  for update;

  if not found then
    raise no_data_found using
      message = 'The current developer does not own this project.';
  end if;

  select count(*), coalesce(max(sort_order), -1) + 1
  into image_count, next_sort_order
  from public.project_images
  where project_images.project_id = p_project_id;

  if image_count >= 5 then
    raise program_limit_exceeded using
      message = 'A project can have no more than five images.';
  end if;

  insert into public.project_images (
    project_id,
    storage_path,
    alt_text,
    sort_order,
    mime_type,
    byte_size,
    width,
    height
  )
  values (
    p_project_id,
    p_storage_path,
    p_alt_text,
    next_sort_order,
    p_mime_type,
    p_byte_size,
    p_width,
    p_height
  )
  returning id into new_image_id;

  return new_image_id;
end;
$$;

create or replace function public.delete_current_project_image(
  p_project_id uuid,
  p_image_id uuid
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id text := (select auth.jwt() ->> 'sub');
  deleted_path text;
  deleted_sort_order smallint;
begin
  if current_user_id is null or current_user_id = '' then
    raise insufficient_privilege using
      message = 'An authenticated Clerk subject is required.';
  end if;

  perform 1
  from public.projects
  where projects.id = p_project_id
    and projects.owner_id = current_user_id
  for update;

  if not found then
    raise no_data_found using
      message = 'The current developer does not own this project.';
  end if;

  delete from public.project_images
  where project_id = p_project_id
    and id = p_image_id
  returning storage_path, sort_order
  into deleted_path, deleted_sort_order;

  if not found then
    raise no_data_found using
      message = 'The project image does not exist.';
  end if;

  set constraints public.project_images_project_order_unique deferred;

  update public.project_images
  set sort_order = sort_order - 1
  where project_id = p_project_id
    and sort_order > deleted_sort_order;

  set constraints public.project_images_project_order_unique immediate;

  return deleted_path;
end;
$$;

create or replace function public.reorder_current_project_images(
  p_project_id uuid,
  p_image_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id text := (select auth.jwt() ->> 'sub');
  image_ids uuid[] := coalesce(p_image_ids, array[]::uuid[]);
  current_image_count integer;
begin
  if current_user_id is null or current_user_id = '' then
    raise insufficient_privilege using
      message = 'An authenticated Clerk subject is required.';
  end if;

  perform 1
  from public.projects
  where projects.id = p_project_id
    and projects.owner_id = current_user_id
  for update;

  if not found then
    raise no_data_found using
      message = 'The current developer does not own this project.';
  end if;

  if (
    select count(distinct selected_id)
    from unnest(image_ids) as selected(selected_id)
  ) <> cardinality(image_ids) then
    raise invalid_parameter_value using
      message = 'Image selections must be unique.';
  end if;

  select count(*)
  into current_image_count
  from public.project_images
  where project_images.project_id = p_project_id;

  if cardinality(image_ids) <> current_image_count
    or exists (
      select 1
      from unnest(image_ids) as selected(selected_id)
      left join public.project_images
        on project_images.id = selected.selected_id
        and project_images.project_id = p_project_id
      where project_images.id is null
    ) then
    raise invalid_parameter_value using
      message = 'Reordering requires exactly the current project image set.';
  end if;

  set constraints public.project_images_project_order_unique deferred;

  update public.project_images
  set sort_order = (ordered.position - 1)::smallint
  from unnest(image_ids) with ordinality as ordered(image_id, position)
  where project_images.project_id = p_project_id
    and project_images.id = ordered.image_id;

  set constraints public.project_images_project_order_unique immediate;
end;
$$;

create or replace function public.delete_current_project(
  p_project_id uuid
)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id text := (select auth.jwt() ->> 'sub');
  storage_paths text[];
begin
  if current_user_id is null or current_user_id = '' then
    raise insufficient_privilege using
      message = 'An authenticated Clerk subject is required.';
  end if;

  perform 1
  from public.projects
  where projects.id = p_project_id
    and projects.owner_id = current_user_id
  for update;

  if not found then
    raise no_data_found using
      message = 'The current developer does not own this project.';
  end if;

  select coalesce(
    array_agg(storage_path order by sort_order),
    array[]::text[]
  )
  into storage_paths
  from public.project_images
  where project_images.project_id = p_project_id;

  delete from public.projects
  where id = p_project_id
    and owner_id = current_user_id;

  return storage_paths;
end;
$$;

revoke all on function public.create_current_project(
  smallint,
  text,
  text,
  text,
  text,
  text,
  smallint[]
) from public, anon;

revoke all on function public.update_current_project(
  uuid,
  smallint,
  text,
  text,
  text,
  text,
  text,
  text,
  smallint[]
) from public, anon;

revoke all on function public.add_current_project_image(
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  integer
) from public, anon;

revoke all on function public.delete_current_project_image(uuid, uuid)
from public, anon;

revoke all on function public.reorder_current_project_images(uuid, uuid[])
from public, anon;

revoke all on function public.delete_current_project(uuid)
from public, anon;

grant execute on function public.create_current_project(
  smallint,
  text,
  text,
  text,
  text,
  text,
  smallint[]
) to authenticated;

grant execute on function public.update_current_project(
  uuid,
  smallint,
  text,
  text,
  text,
  text,
  text,
  text,
  smallint[]
) to authenticated;

grant execute on function public.add_current_project_image(
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  integer
) to authenticated;

grant execute on function public.delete_current_project_image(uuid, uuid)
to authenticated;

grant execute on function public.reorder_current_project_images(uuid, uuid[])
to authenticated;

grant execute on function public.delete_current_project(uuid)
to authenticated;

comment on function public.create_current_project(
  smallint,
  text,
  text,
  text,
  text,
  text,
  smallint[]
) is 'Creates a draft project for the current Clerk subject with curated technologies.';

comment on function public.update_current_project(
  uuid,
  smallint,
  text,
  text,
  text,
  text,
  text,
  text,
  smallint[]
) is 'Updates a Clerk-owned project and atomically replaces its curated technologies.';

comment on function public.add_current_project_image(
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  integer
) is 'Adds trusted image metadata in the next ordered slot of a Clerk-owned project.';

comment on function public.delete_current_project_image(uuid, uuid)
is 'Deletes owned project image metadata, compacts order, and returns its Storage path.';

comment on function public.reorder_current_project_images(uuid, uuid[])
is 'Reorders exactly the current image set for a Clerk-owned project.';

comment on function public.delete_current_project(uuid)
is 'Deletes a Clerk-owned project and returns its ordered image Storage paths.';
