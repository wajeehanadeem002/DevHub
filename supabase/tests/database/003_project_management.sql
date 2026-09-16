-- Run after 202609140003_project_management.sql and supabase/seed.sql in the
-- hosted development database. The transaction rolls back every fixture.
-- Requires a database-owner connection capable of SET ROLE anon/authenticated.

begin;

insert into public.categories (id, slug, name, sort_order)
overriding system value
values (32001, 'project-management-test', 'Project Management Test', 32001);

insert into public.technologies (id, slug, name, sort_order)
overriding system value
values
  (32001, 'project-test-tech-1', 'Project Test Tech 1', 32001),
  (32002, 'project-test-tech-2', 'Project Test Tech 2', 32002),
  (32003, 'project-test-tech-3', 'Project Test Tech 3', 32003),
  (32004, 'project-test-tech-4', 'Project Test Tech 4', 32004),
  (32005, 'project-test-tech-5', 'Project Test Tech 5', 32005),
  (32006, 'project-test-tech-6', 'Project Test Tech 6', 32006),
  (32007, 'project-test-tech-7', 'Project Test Tech 7', 32007),
  (32008, 'project-test-tech-8', 'Project Test Tech 8', 32008),
  (32009, 'project-test-tech-9', 'Project Test Tech 9', 32009);

insert into public.profiles (user_id, username, display_name, is_public)
values
  ('user_project_owner', 'projectowner', 'Project Owner', true),
  ('user_project_other', 'projectother', 'Project Other', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"user_project_owner","role":"authenticated"}',
  true
);

do $$
declare
  created_project_id uuid;
begin
  created_project_id := public.create_current_project(
    32001::smallint,
    'Deterministic Project Title',
    'Initial project summary',
    'Initial project description',
    'https://example.com/demo',
    'https://github.com/example/project',
    array[32001, 32002, 32003]::smallint[]
  );

  if not exists (
    select 1
    from public.projects
    where id = created_project_id
      and owner_id = 'user_project_owner'
      and status = 'draft'
  ) then
    raise exception 'created project did not belong to the Clerk subject as a draft';
  end if;
end;
$$;

do $$
declare
  v_project_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Deterministic Project Title';

  if (
    select count(*)
    from public.project_technologies
    where project_technologies.project_id = v_project_id
  ) is distinct from 3 then
    raise exception 'project creation did not insert three technologies';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.create_current_project(
      32001::smallint, 'Zero Technologies', 'Summary', 'Description', null, null,
      array[]::smallint[]
    );
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'a project with zero technologies was accepted';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.create_current_project(
      32001::smallint, 'Nine Technologies', 'Summary', 'Description', null, null,
      array[32001, 32002, 32003, 32004, 32005, 32006, 32007, 32008, 32009]::smallint[]
    );
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'a project with nine technologies was accepted';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.create_current_project(
      32001::smallint, 'Duplicate Technologies', 'Summary', 'Description', null, null,
      array[32001, 32001]::smallint[]
    );
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'duplicate project technologies were accepted';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.create_current_project(
      32001::smallint, 'Unknown Technology', 'Summary', 'Description', null, null,
      array[32001, 31999]::smallint[]
    );
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'an unknown project technology was accepted';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.create_current_project(
      null::smallint, 'Missing Category', 'Summary', 'Description', null, null,
      array[32001]::smallint[]
    );
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'a project without a category was accepted';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.create_current_project(
      31999::smallint, 'Unknown Category', 'Summary', 'Description', null, null,
      array[32001]::smallint[]
    );
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'an unknown project category was accepted';
  end if;
end;
$$;

select public.update_current_project(
  (
    select id from public.projects
    where owner_id = 'user_project_owner'
      and title = 'Deterministic Project Title'
  ),
  32001::smallint,
  'Published Deterministic Project',
  'Published project summary',
  'Published project description',
  'https://example.com/published',
  'https://github.com/example/published',
  'published',
  array[32002, 32003, 32004]::smallint[]
);

do $$
declare
  v_project_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  if not exists (
    select 1
    from public.projects
    where id = v_project_id
      and status = 'published'
      and published_at is not null
  ) then
    raise exception 'owner could not update and publish the project';
  end if;

  if (
    select array_agg(technology_id order by technology_id)
    from public.project_technologies
    where project_technologies.project_id = v_project_id
  ) is distinct from array[32002, 32003, 32004]::smallint[] then
    raise exception 'project update did not atomically replace technologies';
  end if;
end;
$$;

select public.add_current_project_image(
  (select id from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project'),
  'user_project_owner/' ||
    (select id::text from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project') ||
    '/image-1.jpg',
  'First image', 'image/jpeg', 1001, 801, 601
);
select public.add_current_project_image(
  (select id from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project'),
  'user_project_owner/' ||
    (select id::text from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project') ||
    '/image-2.png',
  'Second image', 'image/png', 1002, 802, 602
);
select public.add_current_project_image(
  (select id from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project'),
  'user_project_owner/' ||
    (select id::text from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project') ||
    '/image-3.webp',
  'Third image', 'image/webp', 1003, 803, 603
);
select public.add_current_project_image(
  (select id from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project'),
  'user_project_owner/' ||
    (select id::text from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project') ||
    '/image-4.jpg',
  'Fourth image', 'image/jpeg', 1004, 804, 604
);
select public.add_current_project_image(
  (select id from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project'),
  'user_project_owner/' ||
    (select id::text from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project') ||
    '/image-5.png',
  'Fifth image', 'image/png', 1005, 805, 605
);

do $$
declare
  v_project_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  if (
    select array_agg(sort_order order by sort_order)
    from public.project_images
    where project_images.project_id = v_project_id
  ) is distinct from array[0, 1, 2, 3, 4]::smallint[] then
    raise exception 'five images were not assigned ordered zero-based slots';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
  v_project_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  begin
    perform public.add_current_project_image(
      v_project_id,
      'user_project_owner/' || v_project_id::text || '/image-6.webp',
      'Sixth image', 'image/webp', 1006, 806, 606
    );
  exception when program_limit_exceeded then
    denied := true;
  end;

  if not denied then
    raise exception 'a sixth project image was accepted';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
  v_project_id uuid;
  first_image_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  select id into strict first_image_id
  from public.project_images
  where project_images.project_id = v_project_id
    and sort_order = 0;

  begin
    perform public.reorder_current_project_images(
      v_project_id,
      array[first_image_id, first_image_id]::uuid[]
    );
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'a duplicate image-ID reorder was accepted';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
  v_project_id uuid;
  incomplete_image_ids uuid[];
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  select array_agg(id order by sort_order)
  into strict incomplete_image_ids
  from public.project_images
  where project_images.project_id = v_project_id
    and sort_order < 4;

  begin
    perform public.reorder_current_project_images(v_project_id, incomplete_image_ids);
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'an incomplete image-ID reorder was accepted';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
  v_project_id uuid;
  wrong_image_ids uuid[];
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  select array_agg(id order by sort_order)
  into strict wrong_image_ids
  from public.project_images
  where project_images.project_id = v_project_id
    and sort_order < 4;

  wrong_image_ids := array_append(
    wrong_image_ids,
    '00000000-0000-4000-8000-000000003201'::uuid
  );

  begin
    perform public.reorder_current_project_images(v_project_id, wrong_image_ids);
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'a reorder containing a foreign image ID was accepted';
  end if;
end;
$$;

select public.reorder_current_project_images(
  (select id from public.projects where owner_id = 'user_project_owner' and title = 'Published Deterministic Project'),
  array(
    select id
    from public.project_images
    where project_id = (
      select id from public.projects
      where owner_id = 'user_project_owner'
        and title = 'Published Deterministic Project'
    )
    order by storage_path desc
  )
);

do $$
declare
  v_project_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  if (
    select array_agg(regexp_replace(storage_path, '^.*/', '') order by sort_order)
    from public.project_images
    where project_images.project_id = v_project_id
  ) is distinct from array[
    'image-5.png', 'image-4.jpg', 'image-3.webp', 'image-2.png', 'image-1.jpg'
  ]::text[] then
    raise exception 'a valid full image reorder did not rewrite zero-based positions';
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_project_other","role":"authenticated"}',
  true
);

do $$
declare
  denied boolean := false;
  v_project_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  begin
    perform public.update_current_project(
      v_project_id, 32001::smallint, 'Unauthorized Update', 'Summary', 'Description',
      null, null, 'draft', array[32001]::smallint[]
    );
  exception when no_data_found then
    denied := true;
  end;

  if not denied then
    raise exception 'another identity updated the project';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
  v_project_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  begin
    perform public.delete_current_project(v_project_id);
  exception when no_data_found then
    denied := true;
  end;

  if not denied then
    raise exception 'another identity deleted the project';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
  v_project_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  begin
    perform public.add_current_project_image(
      v_project_id,
      'user_project_other/' || v_project_id::text || '/unauthorized.jpg',
      'Unauthorized image', 'image/jpeg', 1000, 800, 600
    );
  exception when no_data_found then
    denied := true;
  end;

  if not denied then
    raise exception 'another identity added project image metadata';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
  v_project_id uuid;
  image_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  select id into strict image_id
  from public.project_images
  where project_images.project_id = v_project_id
    and storage_path like '%/image-1.jpg';

  begin
    perform public.delete_current_project_image(v_project_id, image_id);
  exception when no_data_found then
    denied := true;
  end;

  if not denied then
    raise exception 'another identity removed project image metadata';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
  v_project_id uuid;
  image_ids uuid[];
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  select array_agg(id order by sort_order) into strict image_ids
  from public.project_images
  where project_images.project_id = v_project_id;

  begin
    perform public.reorder_current_project_images(v_project_id, image_ids);
  exception when no_data_found then
    denied := true;
  end;

  if not denied then
    raise exception 'another identity reordered project image metadata';
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_project_owner","role":"authenticated"}',
  true
);

do $$
declare
  deleted_path text;
  v_project_id uuid;
  image_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  select id into strict image_id
  from public.project_images
  where project_images.project_id = v_project_id
    and storage_path like '%/image-3.webp';

  deleted_path := public.delete_current_project_image(v_project_id, image_id);

  if deleted_path is distinct from
    'user_project_owner/' || v_project_id::text || '/image-3.webp' then
    raise exception 'image deletion did not return its Storage path';
  end if;

  if (
    select array_agg(sort_order order by sort_order)
    from public.project_images
    where project_images.project_id = v_project_id
  ) is distinct from array[0, 1, 2, 3]::smallint[] then
    raise exception 'image deletion did not compact sort order';
  end if;
end;
$$;

do $$
declare
  deleted_paths text[];
  v_project_id uuid;
begin
  select id into strict v_project_id
  from public.projects
  where owner_id = 'user_project_owner'
    and title = 'Published Deterministic Project';

  deleted_paths := public.delete_current_project(v_project_id);

  if deleted_paths is distinct from array[
    'user_project_owner/' || v_project_id::text || '/image-5.png',
    'user_project_owner/' || v_project_id::text || '/image-4.jpg',
    'user_project_owner/' || v_project_id::text || '/image-2.png',
    'user_project_owner/' || v_project_id::text || '/image-1.jpg'
  ]::text[] then
    raise exception 'project deletion did not return remaining ordered Storage paths';
  end if;

  if exists (select 1 from public.projects where id = v_project_id) then
    raise exception 'project deletion did not delete the project';
  end if;

  if exists (select 1 from public.project_images where project_images.project_id = v_project_id) then
    raise exception 'project image metadata did not cascade on project deletion';
  end if;

  if exists (select 1 from public.project_technologies where project_technologies.project_id = v_project_id) then
    raise exception 'project technology metadata did not cascade on project deletion';
  end if;
end;
$$;

do $$
declare
  deleted_paths text[];
  empty_project_id uuid;
begin
  empty_project_id := public.create_current_project(
    32001::smallint, 'Project Without Images', 'Summary', 'Description', null, null,
    array[32001]::smallint[]
  );

  deleted_paths := public.delete_current_project(empty_project_id);

  if deleted_paths is distinct from array[]::text[] then
    raise exception 'project deletion returned null instead of an empty path array';
  end if;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'project-images'
      and name = 'project-images'
      and public
      and file_size_limit = 10485760
      and allowed_mime_types = array[
        'image/jpeg', 'image/png', 'image/webp'
      ]::text[]
  ) then
    raise exception 'project-images bucket configuration is incorrect';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'DevHub owners upload project images',
        'DevHub owners delete project images'
      )
  ) is distinct from 2 then
    raise exception 'project image Storage policies are missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'DevHub owners upload project images'
      and with_check is not null
      and with_check ~ 'project-images'
      and with_check ~ 'foldername'
      and with_check ~ 'auth.jwt'
      and with_check ~ 'projects'
  ) then
    raise exception 'project image insert policy does not require an existing owned project';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'DevHub owners delete project images'
      and qual is not null
      and qual ~ 'project-images'
      and qual ~ 'foldername'
      and qual ~ 'auth.jwt'
      and qual ~ 'owner_id'
      and qual !~ 'projects'
  ) then
    raise exception 'project image delete policy is not independent of the deleted project row';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.project_images'::regclass
      and conname = 'project_images_project_order_unique'
      and condeferrable
      and not condeferred
  ) then
    raise exception 'project image order uniqueness is not initially-immediate deferrable';
  end if;
end;
$$;

do $$
declare
  function_signatures text[] := array[
    'public.create_current_project(smallint,text,text,text,text,text,smallint[])',
    'public.update_current_project(uuid,smallint,text,text,text,text,text,text,smallint[])',
    'public.add_current_project_image(uuid,text,text,text,integer,integer,integer)',
    'public.delete_current_project_image(uuid,uuid)',
    'public.reorder_current_project_images(uuid,uuid[])',
    'public.delete_current_project(uuid)'
  ]::text[];
  function_signature text;
begin
  foreach function_signature in array function_signatures loop
    if has_function_privilege('anon', function_signature, 'EXECUTE') then
      raise exception 'anon can execute %', function_signature;
    end if;

    if not has_function_privilege('authenticated', function_signature, 'EXECUTE') then
      raise exception 'authenticated cannot execute %', function_signature;
    end if;
  end loop;
end;
$$;

rollback;
