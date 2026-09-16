-- Run after 202609140002_profile_management.sql and supabase/seed.sql in the
-- hosted development database. The transaction rolls back every fixture.
-- Requires a database-owner connection capable of SET ROLE authenticated.

begin;

insert into public.profiles (user_id, username, display_name, is_public)
values
  ('user_profile_owner', 'profileowner', 'Profile Owner', true),
  ('user_profile_other', 'profileother', 'Profile Other', true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"user_profile_owner","role":"authenticated"}',
  true
);

select public.update_current_profile(
  'profileowner',
  'Updated Profile Owner',
  'Full Stack Developer',
  'Builds thoughtful web products.',
  'Lahore, Pakistan',
  'https://example.com',
  'https://github.com/example',
  'https://linkedin.com/in/example',
  true,
  array[1, 2, 3, 4, 5, 6, 7, 8]::smallint[]
);

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where user_id = 'user_profile_owner'
      and display_name = 'Updated Profile Owner'
      and website_url = 'https://example.com'
  ) then
    raise exception 'atomic profile field update failed';
  end if;

  if (
    select count(*)
    from public.profile_technologies
    where user_id = 'user_profile_owner'
  ) <> 8 then
    raise exception 'atomic profile technology replacement failed';
  end if;
end;
$$;

select public.update_current_profile(
  'profileowner',
  'Updated Profile Owner',
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  array[2, 3]::smallint[]
);

do $$
begin
  if (
    select array_agg(technology_id order by technology_id)
    from public.profile_technologies
    where user_id = 'user_profile_owner'
  ) <> array[2, 3]::smallint[] then
    raise exception 'technology replacement did not remove prior rows';
  end if;

  if (
    select is_public
    from public.profiles
    where user_id = 'user_profile_owner'
  ) then
    raise exception 'profile visibility update failed';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.update_current_profile(
      'profileowner',
      'Too Many Technologies',
      null,
      null,
      null,
      null,
      null,
      null,
      true,
      array[1, 2, 3, 4, 5, 6, 7, 8, 9]::smallint[]
    );
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'more than eight profile technologies were accepted';
  end if;
end;
$$;

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.update_current_profile(
      'profileowner',
      'Duplicate Technologies',
      null,
      null,
      null,
      null,
      null,
      null,
      true,
      array[1, 1]::smallint[]
    );
  exception when invalid_parameter_value then
    denied := true;
  end;

  if not denied then
    raise exception 'duplicate profile technologies were accepted';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"user_profile_other","role":"authenticated"}',
  true
);

select public.update_current_profile(
  'profileother',
  'Updated Other Profile',
  null,
  null,
  null,
  null,
  null,
  null,
  true,
  array[]::smallint[]
);

do $$
begin
  if (
    select display_name
    from public.profiles
    where user_id = 'user_profile_owner'
  ) <> 'Updated Profile Owner' then
    raise exception 'one identity changed another profile through the RPC';
  end if;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'avatars'
      and public
      and file_size_limit = 2097152
      and allowed_mime_types = array[
        'image/jpeg', 'image/png', 'image/webp'
      ]::text[]
  ) then
    raise exception 'avatars bucket configuration is incorrect';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'DevHub users upload own avatars',
        'DevHub users delete own avatars'
      )
  ) <> 2 then
    raise exception 'avatar storage policies are missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.update_current_profile(text,text,text,text,text,text,text,text,boolean,smallint[])',
    'EXECUTE'
  ) then
    raise exception 'anon can execute the profile update function';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.update_current_profile(text,text,text,text,text,text,text,text,boolean,smallint[])',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute the profile update function';
  end if;
end;
$$;

rollback;
