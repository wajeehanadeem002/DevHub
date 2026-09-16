# Hosted Supabase workflow

DevHub uses the hosted development project. Docker and the Supabase CLI are
intentionally not part of this repository.

## Apply and verify

Use a database-owner connection or the hosted SQL editor in this order:

1. Run `migrations/202609140001_initial_devhub_schema.sql` once.
2. Run `seed.sql`.
3. Run `tests/database/001_rls.sql` with **Run selected** or an equivalent
   single-session execution. The test opens a transaction and rolls back all
   fixtures.
4. Run `migrations/202609140002_profile_management.sql` once. It adds the
   atomic profile update function and configures the public `avatars` bucket.
5. Run `tests/database/002_profile_management.sql` in one SQL-editor session.
   It rolls back its profile fixtures after checking the function, technology
   replacement, function privileges, and avatar bucket configuration.
6. Run `migrations/202609140003_project_management.sql` once. It adds the
   owner-scoped atomic project and image functions and configures the public
   `project-images` bucket.
7. Run `tests/database/003_project_management.sql` in one SQL-editor session.
   It opens a transaction and rolls back its fixtures after checking project
   ownership isolation, taxonomy replacement, publish state, image ordering and
   limits, function privileges, and Storage bucket/policy configuration.

The RLS test requires permission to `SET ROLE anon` and `SET ROLE
authenticated`; the Supabase SQL editor/database owner has that permission.
Any raised exception is a failed policy assertion.

The `project-images` bucket is public for published image delivery, while write
policies remain owner-scoped through the Clerk JWT subject and project
ownership. Each project supports at most five ordered images. Uploads must be
JPEG, PNG, or WebP and no larger than 10 MiB each. Project images are optional
for publishing; projects without images use the application's deterministic
fallback.

The migration and database tests above are intentionally manual. Do not treat
the hosted Project CRUD behavior as verified until steps 6 and 7 complete in
the hosted SQL editor without a raised exception.

## Type generation

`src/types/database.generated.ts` is the schema-derived type snapshot that
matches the migration. After the migration is applied, replace it with the
hosted project's generated TypeScript output from the Supabase Dashboard type
generator, then run `pnpm typecheck`. This keeps the hosted schema as the final
source of truth without adding the prohibited local CLI.
