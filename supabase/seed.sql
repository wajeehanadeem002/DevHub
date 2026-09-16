-- Deterministic public taxonomy only. No users, projects, or private data.

insert into public.categories (id, slug, name, sort_order)
overriding system value
values
  (1, 'web-applications', 'Web Applications', 10),
  (2, 'mobile-applications', 'Mobile Applications', 20),
  (3, 'developer-tools', 'Developer Tools', 30),
  (4, 'ai-machine-learning', 'AI & Machine Learning', 40),
  (5, 'data-analytics', 'Data & Analytics', 50),
  (6, 'open-source', 'Open Source', 60)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

select setval(
  pg_get_serial_sequence('public.categories', 'id'),
  (select max(id) from public.categories),
  true
);

insert into public.technologies (id, slug, name, sort_order)
overriding system value
values
  (1, 'react', 'React', 10),
  (2, 'next-js', 'Next.js', 20),
  (3, 'typescript', 'TypeScript', 30),
  (4, 'node-js', 'Node.js', 40),
  (5, 'python', 'Python', 50),
  (6, 'java', 'Java', 60),
  (7, 'supabase', 'Supabase', 70),
  (8, 'postgresql', 'PostgreSQL', 80),
  (9, 'ai-ml', 'AI / ML', 90),
  (10, 'tailwind-css', 'Tailwind CSS', 100)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

select setval(
  pg_get_serial_sequence('public.technologies', 'id'),
  (select max(id) from public.technologies),
  true
);
