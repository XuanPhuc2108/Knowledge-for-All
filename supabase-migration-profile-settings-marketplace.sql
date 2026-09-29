begin;

alter table public.profiles
  add column if not exists bio text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists area_label text,
  add column if not exists show_contact_phone boolean not null default false,
  add column if not exists show_contact_email boolean not null default false,
  add column if not exists show_area boolean not null default false;

alter table public.books add column if not exists owner_name text;

update public.books
set owner_name = profiles.full_name
from public.profiles
where books.owner_id = profiles.id
  and books.owner_name is null;

alter table public.books alter column owner_name set not null;

alter table public.books drop constraint if exists books_status_check;
update public.books set status = 'loaned' where status = 'reserved';
update public.books set status = 'exchanged' where status = 'shared';
alter table public.books
  add constraint books_status_check
  check (status in ('available', 'loaned', 'exchanged'));

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create or replace view public.public_profiles with (security_barrier = true) as
select
  id,
  full_name,
  avatar_url,
  case when show_area then area_label else null end as area_label,
  case when show_contact_phone then contact_phone else null end as contact_phone,
  case when show_contact_email then contact_email else null end as contact_email
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

create table if not exists public.book_favorites (
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
alter table public.book_favorites enable row level security;
drop policy if exists "Users can view own book favorites" on public.book_favorites;
drop policy if exists "Users can save own book favorites" on public.book_favorites;
drop policy if exists "Users can remove own book favorites" on public.book_favorites;
create policy "Users can view own book favorites"
  on public.book_favorites for select using (auth.uid() = user_id);
create policy "Users can save own book favorites"
  on public.book_favorites for insert with check (auth.uid() = user_id);
create policy "Users can remove own book favorites"
  on public.book_favorites for delete using (auth.uid() = user_id);
grant select, insert, delete on public.book_favorites to authenticated;

create table if not exists public.book_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  reason text not null check (reason in ('incorrect', 'unavailable', 'inappropriate', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  constraint book_reports_one_per_user unique (reporter_id, book_id)
);
alter table public.book_reports enable row level security;
drop policy if exists "Users can view own book reports" on public.book_reports;
drop policy if exists "Users can report other users books" on public.book_reports;
create policy "Users can view own book reports"
  on public.book_reports for select using (auth.uid() = reporter_id);
create policy "Users can report other users books"
  on public.book_reports for insert with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from public.books
      where books.id = book_id and books.owner_id <> auth.uid()
    )
  );
grant select, insert on public.book_reports to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from auth.users where id = current_user_id;
  if not found then
    raise exception 'Account not found';
  end if;
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

commit;
