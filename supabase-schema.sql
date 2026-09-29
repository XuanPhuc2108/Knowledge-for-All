-- Sách Gần Nhau — Supabase Schema

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  bio text,
  contact_phone text,
  contact_email text,
  area_label text,
  show_contact_phone boolean not null default false,
  show_contact_email boolean not null default false,
  show_area boolean not null default false,
  latitude double precision,
  longitude double precision,
  location_accuracy double precision,
  location_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade not null,
  owner_name text not null,
  title text not null,
  author text,
  category text not null,
  condition text not null check (condition in ('new', 'good', 'used', 'old')),
  exchange_type text not null check (exchange_type in ('share', 'exchange', 'borrow')),
  description text not null,
  image_urls text[] default '{}',
  latitude double precision,
  longitude double precision,
  contact_phone text,
  contact_email text,
  status text not null default 'available' check (status in ('available', 'loaned', 'exchanged')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists exchange_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete cascade not null,
  requester_id uuid references profiles(id) on delete cascade not null,
  owner_id uuid references profiles(id) on delete cascade not null,
  message text,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz default now()
);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books(id) on delete cascade not null,
  owner_id uuid references profiles(id) on delete cascade not null,
  requester_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint chats_distinct_participants check (owner_id <> requester_id),
  constraint chats_book_owner_requester_unique unique (book_id, owner_id, requester_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  body text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz default now()
);

create table if not exists book_favorites (
  user_id uuid references profiles(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table if not exists book_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  reason text not null check (reason in ('incorrect', 'unavailable', 'inappropriate', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  constraint book_reports_one_per_user unique (reporter_id, book_id)
);

alter table profiles enable row level security;
alter table books enable row level security;
alter table exchange_requests enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;
alter table book_favorites enable row level security;
alter table book_reports enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Books are viewable by everyone"
  on books for select using (true);

create policy "Users can insert own books"
  on books for insert with check (auth.uid() = owner_id);

create policy "Users can update own books"
  on books for update using (auth.uid() = owner_id);

create policy "Users can delete own books"
  on books for delete using (auth.uid() = owner_id);

create policy "Exchange requests viewable by participants"
  on exchange_requests for select
  using (auth.uid() = requester_id or auth.uid() = owner_id);

create policy "Users can create exchange requests"
  on exchange_requests for insert
  with check (auth.uid() = requester_id);

create policy "Participants can update exchange requests"
  on exchange_requests for update
  using (auth.uid() = requester_id or auth.uid() = owner_id);

create policy "Chats viewable by participants"
  on chats for select
  using (auth.uid() = requester_id or auth.uid() = owner_id);

create policy "Participants can create chats"
  on chats for insert
  with check (auth.uid() = requester_id or auth.uid() = owner_id);

create policy "Participants can update chats"
  on chats for update
  using (auth.uid() = requester_id or auth.uid() = owner_id)
  with check (auth.uid() = requester_id or auth.uid() = owner_id);

create policy "Messages viewable by chat participants"
  on messages for select
  using (
    exists (
      select 1
      from chats
      where chats.id = messages.chat_id
        and (auth.uid() = chats.requester_id or auth.uid() = chats.owner_id)
    )
  );

create policy "Participants can insert messages"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from chats
      where chats.id = messages.chat_id
        and (auth.uid() = chats.requester_id or auth.uid() = chats.owner_id)
    )
  );

create policy "Users can view own book favorites"
  on book_favorites for select using (auth.uid() = user_id);

create policy "Users can save own book favorites"
  on book_favorites for insert with check (auth.uid() = user_id);

create policy "Users can remove own book favorites"
  on book_favorites for delete using (auth.uid() = user_id);

create policy "Users can view own book reports"
  on book_reports for select using (auth.uid() = reporter_id);

create policy "Users can report other users books"
  on book_reports for insert with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from books
      where books.id = book_id and books.owner_id <> auth.uid()
    )
  );

create or replace view public_profiles with (security_barrier = true) as
select
  id,
  full_name,
  avatar_url,
  case when show_area then area_label else null end as area_label,
  case when show_contact_phone then contact_phone else null end as contact_phone,
  case when show_contact_email then contact_email else null end as contact_email
from profiles;

grant select on public_profiles to anon, authenticated;
grant select, insert, delete on book_favorites to authenticated;
grant select, insert on book_reports to authenticated;

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

create or replace function update_chat_timestamp_on_message()
returns trigger
language plpgsql
as $$
begin
  update chats
  set updated_at = new.created_at
  where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists messages_update_chat_timestamp on messages;

create trigger messages_update_chat_timestamp
after insert on messages
for each row execute function update_chat_timestamp_on_message();

do $$
begin
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object or undefined_object then null;
end $$;
