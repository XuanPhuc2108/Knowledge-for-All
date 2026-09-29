-- Sách Gần Nhau — Supabase Schema

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
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
  status text default 'available' check (status in ('available', 'reserved', 'shared')),
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

alter table profiles enable row level security;
alter table books enable row level security;
alter table exchange_requests enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

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
