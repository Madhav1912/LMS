-- Supabase/Postgres schema for LMS admin + user dashboards
-- Single-tenant, Supabase Auth users with public.profiles for role/status.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Users (profiles) + auto-provisioning on auth.users insert
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('admin','user')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  target_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'requested_role', 'user');

  -- Security: do not allow arbitrary self-promotion.
  -- Only allow 'admin' if there is no active admin yet (first-admin bootstrap).
  if requested_role = 'admin' and not exists (
    select 1 from public.profiles p where p.role = 'admin' and p.status = 'active'
  ) then
    target_role := 'admin';
  else
    target_role := 'user';
  end if;

  insert into public.profiles (id, full_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    target_role,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Assets (Supabase Storage metadata) + Courses + Modules + Module Items
-- -----------------------------------------------------------------------------

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('video','pdf','image','other')),
  storage_bucket text not null,
  storage_path text not null,
  content_type text,
  bytes bigint,
  checksum text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists idx_assets_created_by on public.assets(created_by);
create index if not exists idx_assets_created_at on public.assets(created_at);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  thumbnail_asset_id uuid references public.assets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create index if not exists idx_courses_status on public.courses(status);
create index if not exists idx_courses_created_by on public.courses(created_by);

create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position int not null,
  created_at timestamptz not null default now(),
  unique (course_id, position)
);

create index if not exists idx_course_modules_course_id on public.course_modules(course_id);

create table if not exists public.module_items (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  item_type text not null check (item_type in ('video','pdf')),
  asset_id uuid not null references public.assets(id) on delete restrict,
  position int not null,
  duration_seconds int,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (module_id, position)
);

create index if not exists idx_module_items_module_id on public.module_items(module_id);
create index if not exists idx_module_items_asset_id on public.module_items(asset_id);

-- -----------------------------------------------------------------------------
-- Enrollment/assignment + per-item progress
-- -----------------------------------------------------------------------------

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null check (source in ('self','admin','learning_path')),
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  status text not null default 'assigned'
    check (status in ('assigned','in_progress','completed','dropped')),
  time_spent_ms bigint not null default 0,
  unique (user_id, course_id)
);

create index if not exists idx_course_enrollments_user_id on public.course_enrollments(user_id);
create index if not exists idx_course_enrollments_course_id on public.course_enrollments(course_id);
create index if not exists idx_course_enrollments_status on public.course_enrollments(status);

create table if not exists public.item_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_item_id uuid not null references public.module_items(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','completed')),
  progress_percent numeric(5,2) not null default 0,
  last_position_seconds int,
  last_viewed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  unique (user_id, module_item_id)
);

create index if not exists idx_item_progress_user_id on public.item_progress(user_id);
create index if not exists idx_item_progress_module_item_id on public.item_progress(module_item_id);
create index if not exists idx_item_progress_status on public.item_progress(status);

-- -----------------------------------------------------------------------------
-- Learning paths + assignments
-- -----------------------------------------------------------------------------

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_learning_paths_status on public.learning_paths(status);
create index if not exists idx_learning_paths_created_by on public.learning_paths(created_by);

create table if not exists public.learning_path_courses (
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  position int not null,
  primary key (learning_path_id, course_id),
  unique (learning_path_id, position)
);

create index if not exists idx_learning_path_courses_course_id on public.learning_path_courses(course_id);

create table if not exists public.learning_path_assignments (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  status text not null default 'assigned' check (status in ('assigned','in_progress','completed')),
  unique (learning_path_id, user_id)
);

create index if not exists idx_lp_assignments_user_id on public.learning_path_assignments(user_id);
create index if not exists idx_lp_assignments_lp_id on public.learning_path_assignments(learning_path_id);
create index if not exists idx_lp_assignments_status on public.learning_path_assignments(status);

-- -----------------------------------------------------------------------------
-- Analytics / events
-- -----------------------------------------------------------------------------

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  course_id uuid references public.courses(id) on delete set null,
  module_item_id uuid references public.module_items(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at);
create index if not exists idx_analytics_events_type_created_at on public.analytics_events(event_type, created_at);
create index if not exists idx_analytics_events_course_id on public.analytics_events(course_id);

-- -----------------------------------------------------------------------------
-- Certifications
-- -----------------------------------------------------------------------------

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  rule_type text not null check (rule_type in ('course_completion','learning_path_completion')),
  course_id uuid references public.courses(id) on delete cascade,
  learning_path_id uuid references public.learning_paths(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (rule_type = 'course_completion' and course_id is not null and learning_path_id is null) or
    (rule_type = 'learning_path_completion' and learning_path_id is not null and course_id is null)
  )
);

create index if not exists idx_certifications_rule_type on public.certifications(rule_type);
create index if not exists idx_certifications_course_id on public.certifications(course_id);
create index if not exists idx_certifications_lp_id on public.certifications(learning_path_id);

create table if not exists public.issued_certificates (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  issued_at timestamptz not null default now(),
  certificate_number text not null,
  unique (certification_id, user_id),
  unique (certificate_number)
);

create index if not exists idx_issued_certificates_user_id on public.issued_certificates(user_id);
create index if not exists idx_issued_certificates_cert_id on public.issued_certificates(certification_id);

-- -----------------------------------------------------------------------------
-- Views for dashboards (progress + basic analytics)
-- -----------------------------------------------------------------------------

create or replace view public.v_course_progress as
with enrolled_users as (
  select
    ce.user_id,
    ce.course_id
  from public.course_enrollments ce
),
required_items as (
  select
    cm.course_id,
    mi.id as module_item_id
  from public.course_modules cm
  join public.module_items mi on mi.module_id = cm.id
  where mi.is_required = true
),
user_items as (
  select
    eu.user_id,
    eu.course_id,
    ri.module_item_id
  from enrolled_users eu
  join required_items ri on ri.course_id = eu.course_id
)
select
  ui.user_id,
  ui.course_id,
  count(*)::int as required_items_total,
  count(*) filter (where ip.status = 'completed')::int as required_items_completed,
  case
    when count(*) = 0 then 0
    else round((count(*) filter (where ip.status = 'completed')::numeric / count(*)::numeric) * 100, 2)
  end as completion_percent,
  max(ip.completed_at) as last_item_completed_at
from user_items ui
left join public.item_progress ip
  on ip.user_id = ui.user_id
 and ip.module_item_id = ui.module_item_id
group by ui.user_id, ui.course_id;

create or replace view public.v_learning_path_progress as
with lp_courses as (
  select
    lpc.learning_path_id,
    lpc.course_id
  from public.learning_path_courses lpc
),
course_completion as (
  select
    vcp.user_id,
    vcp.course_id,
    (vcp.required_items_total > 0 and vcp.required_items_completed = vcp.required_items_total) as is_course_completed
  from public.v_course_progress vcp
)
select
  lpa.user_id,
  lpa.learning_path_id,
  count(*)::int as courses_total,
  count(*) filter (where cc.is_course_completed is true)::int as courses_completed,
  case
    when count(*) = 0 then 0
    else round((count(*) filter (where cc.is_course_completed is true)::numeric / count(*)::numeric) * 100, 2)
  end as completion_percent
from public.learning_path_assignments lpa
join lp_courses lc on lc.learning_path_id = lpa.learning_path_id
left join course_completion cc
  on cc.user_id = lpa.user_id
 and cc.course_id = lc.course_id
group by lpa.user_id, lpa.learning_path_id;

create or replace view public.v_course_analytics as
select
  c.id as course_id,
  c.title as course_title,
  count(ce.*)::int as enrollments_total,
  count(ce.*) filter (where ce.status = 'in_progress')::int as enrollments_in_progress,
  count(ce.*) filter (where ce.status = 'completed')::int as enrollments_completed,
  count(ce.*) filter (where ce.started_at is not null)::int as started_count,
  max(ce.assigned_at) as last_assigned_at,
  max(ce.started_at) as last_started_at,
  max(ce.completed_at) as last_completed_at
from public.courses c
left join public.course_enrollments ce on ce.course_id = c.id
group by c.id, c.title;

-- -----------------------------------------------------------------------------
-- RLS (admin/user dashboards)
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.module_items enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.item_progress enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_courses enable row level security;
alter table public.learning_path_assignments enable row level security;
alter table public.analytics_events enable row level security;
alter table public.certifications enable row level security;
alter table public.issued_certificates enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- ASSETS (metadata only; binaries are in Storage)
drop policy if exists "assets_select_authenticated" on public.assets;
create policy "assets_select_authenticated"
on public.assets
for select
to authenticated
using (true);

drop policy if exists "assets_admin_write" on public.assets;
create policy "assets_admin_insert"
on public.assets
for insert
to authenticated
with check (public.is_admin());

create policy "assets_admin_update"
on public.assets
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "assets_admin_delete"
on public.assets
for delete
to authenticated
using (public.is_admin());

-- COURSES (users see published, assigned, or admin)
drop policy if exists "courses_select_published_or_admin" on public.courses;
create policy "courses_select_published_or_admin"
on public.courses
for select
to authenticated
using (
  status = 'published'
  or public.is_admin()
  or exists (
    select 1 from public.course_enrollments ce
    where ce.course_id = courses.id and ce.user_id = auth.uid()
  )
);

drop policy if exists "courses_admin_write" on public.courses;
create policy "courses_admin_write"
on public.courses
for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "courses_admin_update" on public.courses;
create policy "courses_admin_update"
on public.courses
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "courses_admin_delete" on public.courses;
create policy "courses_admin_delete"
on public.courses
for delete
to authenticated
using (public.is_admin());

-- MODULES / ITEMS (visible if course is visible)
drop policy if exists "course_modules_select_visible_course" on public.course_modules;
create policy "course_modules_select_visible_course"
on public.course_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_modules.course_id
      and (
        c.status = 'published'
        or public.is_admin()
        or exists (
          select 1 from public.course_enrollments ce
          where ce.course_id = c.id and ce.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "course_modules_admin_write" on public.course_modules;
create policy "course_modules_admin_write"
on public.course_modules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "module_items_select_visible_course" on public.module_items;
create policy "module_items_select_visible_course"
on public.module_items
for select
to authenticated
using (
  exists (
    select 1
    from public.course_modules cm
    join public.courses c on c.id = cm.course_id
    where cm.id = module_items.module_id
      and (
        c.status = 'published'
        or public.is_admin()
        or exists (
          select 1 from public.course_enrollments ce
          where ce.course_id = c.id and ce.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "module_items_admin_write" on public.module_items;
create policy "module_items_admin_write"
on public.module_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ENROLLMENTS (users see their own; admin sees all)
drop policy if exists "course_enrollments_select_own_or_admin" on public.course_enrollments;
create policy "course_enrollments_select_own_or_admin"
on public.course_enrollments
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- allow admin to assign enrollments
drop policy if exists "course_enrollments_admin_write" on public.course_enrollments;
create policy "course_enrollments_admin_write"
on public.course_enrollments
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "course_enrollments_update_own_or_admin" on public.course_enrollments;
create policy "course_enrollments_update_own_or_admin"
on public.course_enrollments
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "course_enrollments_admin_delete" on public.course_enrollments;
create policy "course_enrollments_admin_delete"
on public.course_enrollments
for delete
to authenticated
using (public.is_admin());

-- Users may no longer self-enroll; admin assigns courses.
drop policy if exists "course_enrollments_self_enroll_published" on public.course_enrollments;

-- ITEM PROGRESS (users manage their own; admin read all)
drop policy if exists "item_progress_select_own_or_admin" on public.item_progress;
create policy "item_progress_select_own_or_admin"
on public.item_progress
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "item_progress_upsert_own" on public.item_progress;
create policy "item_progress_upsert_own"
on public.item_progress
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "item_progress_update_own" on public.item_progress;
create policy "item_progress_update_own"
on public.item_progress
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- LEARNING PATHS (users see published; admins manage)
drop policy if exists "learning_paths_select_published_or_admin" on public.learning_paths;
create policy "learning_paths_select_published_or_admin"
on public.learning_paths
for select
to authenticated
using (status = 'published' or public.is_admin());

drop policy if exists "learning_paths_admin_write" on public.learning_paths;
create policy "learning_paths_admin_write"
on public.learning_paths
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "learning_path_courses_select_visible_lp" on public.learning_path_courses;
create policy "learning_path_courses_select_visible_lp"
on public.learning_path_courses
for select
to authenticated
using (
  exists (
    select 1
    from public.learning_paths lp
    where lp.id = learning_path_courses.learning_path_id
      and (lp.status = 'published' or public.is_admin())
  )
);

drop policy if exists "learning_path_courses_admin_write" on public.learning_path_courses;
create policy "learning_path_courses_admin_write"
on public.learning_path_courses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "lp_assignments_select_own_or_admin" on public.learning_path_assignments;
create policy "lp_assignments_select_own_or_admin"
on public.learning_path_assignments
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "lp_assignments_admin_write" on public.learning_path_assignments;
create policy "lp_assignments_admin_write"
on public.learning_path_assignments
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "lp_assignments_update_own_or_admin" on public.learning_path_assignments;
create policy "lp_assignments_update_own_or_admin"
on public.learning_path_assignments
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- ANALYTICS (admin can read; users can insert their own events)
drop policy if exists "analytics_events_admin_read" on public.analytics_events;
create policy "analytics_events_admin_read"
on public.analytics_events
for select
to authenticated
using (public.is_admin());

drop policy if exists "analytics_events_insert_own" on public.analytics_events;
create policy "analytics_events_insert_own"
on public.analytics_events
for insert
to authenticated
with check (user_id = auth.uid());

-- CERTIFICATIONS (users can read; admin manages)
drop policy if exists "certifications_select_authenticated" on public.certifications;
create policy "certifications_select_authenticated"
on public.certifications
for select
to authenticated
using (true);

drop policy if exists "certifications_admin_write" on public.certifications;
create policy "certifications_admin_write"
on public.certifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ISSUED CERTIFICATES (users read their own; admin reads all; admin issues)
drop policy if exists "issued_certificates_select_own_or_admin" on public.issued_certificates;
create policy "issued_certificates_select_own_or_admin"
on public.issued_certificates
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "issued_certificates_admin_issue" on public.issued_certificates;
create policy "issued_certificates_admin_issue"
on public.issued_certificates
for insert
to authenticated
with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Admin RPC: list users with email (joins auth.users)
-- -----------------------------------------------------------------------------

create or replace function public.admin_get_users()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.full_name, u.email, p.role, p.status, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

revoke execute on function public.admin_get_users() from public, anon, authenticated;
grant execute on function public.admin_get_users() to authenticated;

-- Admin: user course assignments + progress
create or replace function public.admin_get_user_course_progress(p_user_id uuid)
returns table (
  enrollment_id uuid,
  course_id uuid,
  course_title text,
  enrollment_status text,
  completion_percent numeric,
  required_items_total int,
  required_items_completed int,
  time_spent_ms bigint,
  started_at timestamptz,
  completed_at timestamptz,
  assigned_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ce.id as enrollment_id,
    c.id as course_id,
    c.title as course_title,
    ce.status as enrollment_status,
    coalesce(vcp.completion_percent, 0) as completion_percent,
    coalesce(vcp.required_items_total, 0) as required_items_total,
    coalesce(vcp.required_items_completed, 0) as required_items_completed,
    ce.time_spent_ms,
    ce.started_at,
    ce.completed_at,
    ce.assigned_at
  from public.course_enrollments ce
  join public.courses c on c.id = ce.course_id
  left join public.v_course_progress vcp
    on vcp.user_id = ce.user_id and vcp.course_id = ce.course_id
  where ce.user_id = p_user_id
    and public.is_admin()
  order by ce.assigned_at desc;
$$;

revoke execute on function public.admin_get_user_course_progress(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_user_course_progress(uuid) to authenticated;

-- Migration helper (run on existing databases):
-- alter table public.course_enrollments add column if not exists time_spent_ms bigint not null default 0;

