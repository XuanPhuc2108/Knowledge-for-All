begin;

create table if not exists public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user'
    check (role in ('user', 'moderator', 'admin', 'owner')),
  created_at timestamptz not null default now()
);
create unique index if not exists app_user_roles_single_owner_idx
  on public.app_user_roles (role)
  where role = 'owner';

alter table public.app_user_roles enable row level security;
revoke all on public.app_user_roles from anon, authenticated;
grant select on public.app_user_roles to authenticated;

create or replace function public.get_my_app_role()
returns table (user_id uuid, role text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid(),
    coalesce(
      (select roles.role from public.app_user_roles as roles where roles.user_id = auth.uid()),
      'user'
    );
$$;
revoke all on function public.get_my_app_role() from public, anon;
grant execute on function public.get_my_app_role() to authenticated;

create or replace function public.has_app_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.app_user_roles as roles
    where roles.user_id = auth.uid()
      and roles.role = any (allowed_roles)
  );
$$;
revoke all on function public.has_app_role(text[]) from public, anon;
grant execute on function public.has_app_role(text[]) to authenticated;

drop policy if exists "Users and trusted staff can view app roles" on public.app_user_roles;
create policy "Users and trusted staff can view app roles"
  on public.app_user_roles for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_app_role(array['admin', 'owner']::text[])
  );

alter table public.book_reports
  add column if not exists status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.book_reports drop constraint if exists book_reports_status_check;
alter table public.book_reports
  add constraint book_reports_status_check
  check (status in ('pending', 'reviewed', 'resolved'));
create index if not exists book_reports_status_created_at_idx
  on public.book_reports (status, created_at desc);

create or replace function public.set_book_report_reviewer()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;
drop trigger if exists book_reports_set_reviewer on public.book_reports;
create trigger book_reports_set_reviewer
before update of status on public.book_reports
for each row execute function public.set_book_report_reviewer();

drop policy if exists "Trusted staff can view all book reports" on public.book_reports;
create policy "Trusted staff can view all book reports"
  on public.book_reports for select to authenticated
  using (public.has_app_role(array['moderator', 'admin', 'owner']::text[]));
drop policy if exists "Trusted staff can update book reports" on public.book_reports;
create policy "Trusted staff can update book reports"
  on public.book_reports for update to authenticated
  using (public.has_app_role(array['moderator', 'admin', 'owner']::text[]))
  with check (public.has_app_role(array['moderator', 'admin', 'owner']::text[]));
grant update on public.book_reports to authenticated;

drop policy if exists "Trusted staff can moderate books" on public.books;
create policy "Trusted staff can moderate books"
  on public.books for all to authenticated
  using (public.has_app_role(array['moderator', 'admin', 'owner']::text[]))
  with check (public.has_app_role(array['moderator', 'admin', 'owner']::text[]));
grant delete on public.books to authenticated;

commit;
