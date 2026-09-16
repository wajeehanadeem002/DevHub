-- Run after the initial migration and supabase/seed.sql in the hosted
-- development database. The transaction always rolls back test fixtures.
-- Requires a database-owner connection capable of SET ROLE anon/authenticated.

begin;

insert into public.categories (id, slug, name, sort_order)
overriding system value
values (32000, 'rls-test-category', 'RLS Test Category', 32000)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.profiles (
  user_id, username, display_name, is_public
)
values
  ('user_test_owner', 'testowner', 'Test Owner', true),
  ('user_test_liker', 'testliker', 'Test Liker', true),
  ('user_test_private', 'testprivate', 'Test Private', false);

insert into public.projects (
  id, owner_id, category_id, title, summary, description, status
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'user_test_owner',
    32000,
    'Public Project',
    'Public project summary',
    'Public project description',
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'user_test_owner',
    32000,
    'Draft Project',
    'Draft project summary',
    'Draft project description',
    'draft'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'user_test_private',
    32000,
    'Private Owner Project',
    'Private owner project summary',
    'Private owner project description',
    'published'
  );

set local role anon;
select set_config('request.jwt.claims', '{}', true);

do $$
begin
  if (select count(*) from public.profiles where user_id like 'user_test_%') <> 2 then
    raise exception 'anonymous profile visibility failed';
  end if;

  if (
    select count(*) from public.projects
    where id in (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000003'
    )
  ) <> 1 then
    raise exception 'anonymous project visibility failed';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"user_test_owner","role":"authenticated"}',
  true
);

do $$
declare
  affected integer;
begin
  if (
    select count(*) from public.projects
    where id in (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002'
    )
  ) <> 2 then
    raise exception 'owner cannot read own published and draft projects';
  end if;

  update public.projects
    set title = 'Owner Updated Draft'
    where id = '00000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'owner project update failed';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"user_test_liker","role":"authenticated"}',
  true
);

do $$
declare
  affected integer;
begin
  if exists (
    select 1 from public.projects
    where id = '00000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'non-owner can read an owner draft';
  end if;

  update public.projects
    set title = 'Unauthorized Update'
    where id = '00000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'non-owner updated another user project';
  end if;

  delete from public.projects
    where id = '00000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'non-owner deleted another user project';
  end if;
end;
$$;

insert into public.project_likes (project_id)
values ('00000000-0000-4000-8000-000000000001');

do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.project_likes (project_id)
    values ('00000000-0000-4000-8000-000000000001');
  exception when unique_violation then
    denied := true;
  end;

  if not denied then
    raise exception 'duplicate like was not rejected';
  end if;
end;
$$;

insert into public.project_saves (project_id)
values ('00000000-0000-4000-8000-000000000001');

do $$
begin
  if (
    select count(*) from public.project_likes
    where project_id = '00000000-0000-4000-8000-000000000001'
  ) <> 1 then
    raise exception 'user cannot read their own like';
  end if;

  if (
    select count(*) from public.project_saves
    where project_id = '00000000-0000-4000-8000-000000000001'
  ) <> 1 then
    raise exception 'user cannot read their own save';
  end if;
end;
$$;

reset role;

do $$
begin
  if (
    select like_count from public.projects
    where id = '00000000-0000-4000-8000-000000000001'
  ) <> 1 then
    raise exception 'like counter did not increment atomically';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"user_test_owner","role":"authenticated"}',
  true
);

do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.project_likes (project_id)
    values ('00000000-0000-4000-8000-000000000001');
  exception when others then
    denied := true;
  end;
  if not denied then
    raise exception 'owner was allowed to like own project';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.project_saves (project_id)
    values ('00000000-0000-4000-8000-000000000001');
  exception when others then
    denied := true;
  end;
  if not denied then
    raise exception 'owner was allowed to save own project';
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1 from public.project_likes
    where project_id = '00000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'another user like row is visible to the project owner';
  end if;

  if exists (
    select 1 from public.project_saves
    where project_id = '00000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'another user save row is visible to the project owner';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    update public.projects
      set like_count = 999
      where id = '00000000-0000-4000-8000-000000000001';
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'authenticated client can update protected like_count';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    update public.projects
      set owner_id = 'user_test_liker'
      where id = '00000000-0000-4000-8000-000000000001';
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'authenticated client can update protected owner_id';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.categories (slug, name)
    values ('unauthorized-taxonomy', 'Unauthorized Taxonomy');
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'authenticated client can write taxonomy';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    perform event_id from public.clerk_webhook_events limit 1;
  exception when insufficient_privilege then
    denied := true;
  end;
  if not denied then
    raise exception 'authenticated client can access webhook events';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"user_test_new","role":"authenticated"}',
  true
);

insert into public.profiles (username, display_name)
values ('testnew', 'Test New');

do $$
begin
  if not exists (
    select 1 from public.profiles where user_id = 'user_test_new'
  ) then
    raise exception 'Clerk sub was not used as the profile identity';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    insert into public.profiles (user_id, username, display_name)
    values ('user_test_spoofed', 'testspoofed', 'Test Spoofed');
  exception when insufficient_privilege or check_violation then
    denied := true;
  end;
  if not denied then
    raise exception 'client can override profile identity instead of Clerk sub';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"user_test_liker","role":"authenticated"}',
  true
);

delete from public.project_likes
where project_id = '00000000-0000-4000-8000-000000000001';

reset role;

do $$
begin
  if (
    select like_count from public.projects
    where id = '00000000-0000-4000-8000-000000000001'
  ) <> 0 then
    raise exception 'like counter did not decrement atomically';
  end if;
end;
$$;

rollback;
