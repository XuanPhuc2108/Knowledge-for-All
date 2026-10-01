begin;

create table if not exists public.app_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  book_id uuid,
  report_id uuid,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_audit_log enable row level security;
revoke all on public.app_audit_log from public, anon, authenticated;
revoke insert (id, actor_id, subject_user_id, book_id, report_id, event_type, details, created_at),
  update (id, actor_id, subject_user_id, book_id, report_id, event_type, details, created_at),
  delete on public.app_audit_log from public, anon, authenticated;
grant select on public.app_audit_log to authenticated;
drop policy if exists "Staff can read audit events" on public.app_audit_log;
create policy "Staff can read audit events"
  on public.app_audit_log for select to authenticated
  using (public.has_app_role(array['admin', 'owner']::text[]));

create or replace function public.list_app_users_for_staff()
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  role text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_app_role(array['admin', 'owner']::text[]) then
    raise exception 'Not authorized';
  end if;

  return query
  select p.id, p.full_name, p.avatar_url, coalesce(r.role, 'user'), p.created_at
  from public.profiles as p
  left join public.app_user_roles as r on r.user_id = p.id
  order by p.created_at desc
  limit 200;
end;
$$;
revoke all on function public.list_app_users_for_staff() from public, anon;
grant execute on function public.list_app_users_for_staff() to authenticated;

create or replace function public.set_app_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  previous_role text;
begin
  if auth.uid() is null or not public.has_app_role(array['owner']::text[]) then
    raise exception 'Not authorized';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Owners cannot change their own role';
  end if;
  if p_role not in ('user', 'moderator', 'admin') then
    raise exception 'Invalid role';
  end if;

  select r.role into previous_role
  from public.app_user_roles as r
  where r.user_id = p_user_id
  for update;

  if previous_role = 'owner' then
    raise exception 'The owner role can only be assigned through the trusted setup process';
  end if;

  insert into public.app_user_roles (user_id, role)
  values (p_user_id, p_role)
  on conflict (user_id) do update set role = excluded.role;

  insert into public.app_audit_log (
    actor_id, subject_user_id, event_type, details
  ) values (
    auth.uid(),
    p_user_id,
    'role.changed',
    jsonb_build_object('from', coalesce(previous_role, 'user'), 'to', p_role)
  );
end;
$$;
revoke all on function public.set_app_user_role(uuid, text) from public, anon;
grant execute on function public.set_app_user_role(uuid, text) to authenticated;

create or replace function public.get_staff_platform_summary()
returns table (
  user_count bigint,
  book_count bigint,
  pending_report_count bigint,
  active_request_count bigint,
  completed_interaction_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_app_role(array['admin', 'owner']::text[]) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.books),
    (select count(*) from public.book_reports where status = 'pending'),
    (select count(*) from public.exchange_requests where status in ('pending', 'accepted')),
    (select count(*) from public.exchange_requests where status = 'completed');
end;
$$;
revoke all on function public.get_staff_platform_summary() from public, anon;
grant execute on function public.get_staff_platform_summary() to authenticated;

create or replace function public.audit_book_moderation_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is not null
    and auth.uid() <> old.owner_id
    and public.has_app_role(array['moderator', 'admin', 'owner']::text[]) then
    insert into public.app_audit_log (actor_id, book_id, event_type, details)
    values (
      auth.uid(),
      old.id,
      'book.moderation_deleted',
      jsonb_build_object('title', old.title, 'owner_id', old.owner_id)
    );
  end if;
  return old;
end;
$$;
drop trigger if exists books_audit_moderation_delete on public.books;
create trigger books_audit_moderation_delete
after delete on public.books
for each row execute function public.audit_book_moderation_delete();

create or replace function public.audit_report_status_change()
returns trigger
language plpgsql
security definer
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.app_audit_log (actor_id, book_id, report_id, event_type, details)
    values (
      auth.uid(),
      new.book_id,
      new.id,
      'report.status_changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;
drop trigger if exists book_reports_audit_status_change on public.book_reports;
create trigger book_reports_audit_status_change
after update of status on public.book_reports
for each row execute function public.audit_report_status_change();

alter table public.exchange_requests
  add column if not exists owner_completed_at timestamptz,
  add column if not exists requester_completed_at timestamptz,
  add column if not exists completed_at timestamptz;
alter table public.exchange_requests
  drop constraint if exists exchange_requests_status_check;
alter table public.exchange_requests
  add constraint exchange_requests_status_check
  check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'completed'));
create index if not exists exchange_requests_owner_status_created_idx
  on public.exchange_requests (owner_id, status, created_at desc);
create index if not exists exchange_requests_requester_status_created_idx
  on public.exchange_requests (requester_id, status, created_at desc);
drop index if exists public.exchange_requests_one_active_per_book_requester_idx;
create index if not exists exchange_requests_active_book_requester_idx
  on public.exchange_requests (book_id, requester_id)
  where status in ('pending', 'accepted');

drop policy if exists "Users can create exchange requests" on public.exchange_requests;
drop policy if exists "Participants can update exchange requests" on public.exchange_requests;
drop policy if exists "Participants can insert exchange requests" on public.exchange_requests;
revoke insert, update, delete on public.exchange_requests from public, anon, authenticated;
revoke insert (id, book_id, requester_id, owner_id, message, status, created_at, owner_completed_at, requester_completed_at, completed_at),
  update (id, book_id, requester_id, owner_id, message, status, created_at, owner_completed_at, requester_completed_at, completed_at)
  on public.exchange_requests from public, anon, authenticated;
grant select on public.exchange_requests to authenticated;

create or replace function public.create_book_exchange_request(p_book_id uuid, p_message text)
returns table (request_id uuid, chat_id uuid, owner_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  target_owner uuid;
  created_request_id uuid;
  created_chat_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) < 10
    or char_length(p_message) > 1000 then
    raise exception 'Message must contain 10 to 1000 characters';
  end if;

  select b.owner_id into target_owner
  from public.books as b
  where b.id = p_book_id and b.status = 'available'
  for update;
  if target_owner is null then
    raise exception 'Book is not available';
  end if;
  if target_owner = actor_id then
    raise exception 'Cannot request your own book';
  end if;
  if exists (
    select 1 from public.exchange_requests as existing
    where existing.book_id = p_book_id
      and existing.requester_id = actor_id
      and existing.status in ('pending', 'accepted')
  ) then
    raise exception 'An active request already exists for this book';
  end if;
  if exists (
    select 1 from public.exchange_requests as existing
    where existing.book_id = p_book_id
      and existing.status = 'accepted'
  ) then
    raise exception 'This book already has an active accepted request';
  end if;

  insert into public.exchange_requests (
    book_id, requester_id, owner_id, message, status
  ) values (
    p_book_id, actor_id, target_owner, btrim(p_message), 'pending'
  )
  returning id into created_request_id;

  select c.id into created_chat_id
  from public.chats as c
  where c.book_id = p_book_id
    and c.owner_id = target_owner
    and c.requester_id = actor_id;

  return query select created_request_id, created_chat_id, target_owner;
end;
$$;
revoke all on function public.create_book_exchange_request(uuid, text) from public, anon;
grant execute on function public.create_book_exchange_request(uuid, text) to authenticated;

create or replace function public.create_chat_for_exchange_request()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.chats (book_id, owner_id, requester_id)
  values (new.book_id, new.owner_id, new.requester_id)
  on conflict (book_id, owner_id, requester_id) do nothing;
  return new;
end;
$$;
drop trigger if exists exchange_requests_create_chat on public.exchange_requests;
create trigger exchange_requests_create_chat
after insert on public.exchange_requests
for each row execute function public.create_chat_for_exchange_request();

insert into public.chats (book_id, owner_id, requester_id)
select distinct r.book_id, r.owner_id, r.requester_id
from public.exchange_requests as r
where r.status in ('pending', 'accepted')
on conflict (book_id, owner_id, requester_id) do nothing;

create or replace function public.update_book_exchange_request(p_request_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  request_row public.exchange_requests%rowtype;
  next_status text;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into request_row
  from public.exchange_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception 'Request not found';
  end if;

  if p_action in ('accept', 'reject') then
    if actor_id <> request_row.owner_id or request_row.status <> 'pending' then
      raise exception 'Not authorized to change this request';
    end if;
    if p_action = 'accept' then
      perform 1
      from public.books as b
      where b.id = request_row.book_id and b.status = 'available'
      for update;
      if not found then
        raise exception 'Book is no longer available';
      end if;
      if exists (
        select 1 from public.exchange_requests as existing
        where existing.book_id = request_row.book_id
          and existing.id <> request_row.id
          and existing.status = 'accepted'
      ) then
        raise exception 'Another request is already accepted for this book';
      end if;
    end if;
    next_status := case when p_action = 'accept' then 'accepted' else 'rejected' end;
    update public.exchange_requests set status = next_status where id = p_request_id;
    if p_action = 'accept' then
      update public.exchange_requests
      set status = 'rejected'
      where book_id = request_row.book_id
        and id <> p_request_id
        and status = 'pending';
    end if;
    return next_status;
  end if;

  if p_action = 'cancel' then
    if actor_id <> request_row.requester_id or request_row.status <> 'pending' then
      raise exception 'Not authorized to cancel this request';
    end if;
    update public.exchange_requests set status = 'cancelled' where id = p_request_id;
    return 'cancelled';
  end if;

  if p_action = 'confirm-completion' then
    if request_row.status <> 'accepted'
      or actor_id not in (request_row.owner_id, request_row.requester_id) then
      raise exception 'This interaction cannot be completed';
    end if;

    if actor_id = request_row.owner_id then
      update public.exchange_requests
      set owner_completed_at = coalesce(owner_completed_at, now())
      where id = p_request_id;
    else
      update public.exchange_requests
      set requester_completed_at = coalesce(requester_completed_at, now())
      where id = p_request_id;
    end if;

    update public.exchange_requests
    set status = 'completed', completed_at = now()
    where id = p_request_id
      and owner_completed_at is not null
      and requester_completed_at is not null;

    select status into next_status
    from public.exchange_requests
    where id = p_request_id;
    return next_status;
  end if;

  raise exception 'Invalid request action';
end;
$$;
revoke all on function public.update_book_exchange_request(uuid, text) from public, anon;
grant execute on function public.update_book_exchange_request(uuid, text) to authenticated;

drop policy if exists "Chats viewable by participants" on public.chats;
drop policy if exists "Participants can create chats" on public.chats;
drop policy if exists "Participants can update chats" on public.chats;
revoke insert, update, delete on public.chats from public, anon, authenticated;
revoke insert (id, book_id, owner_id, requester_id, created_at, updated_at),
  update (id, book_id, owner_id, requester_id, created_at, updated_at),
  delete on public.chats from public, anon, authenticated;
grant select on public.chats to authenticated;
create or replace function public.can_access_book_chat(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.chats as c
    join public.exchange_requests as r
      on r.book_id = c.book_id
      and r.owner_id = c.owner_id
      and r.requester_id = c.requester_id
    where c.id = p_chat_id
      and auth.uid() in (c.owner_id, c.requester_id)
      and r.status in ('pending', 'accepted', 'completed')
  );
$$;
revoke all on function public.can_access_book_chat(uuid) from public, anon;
grant execute on function public.can_access_book_chat(uuid) to authenticated;
create policy "Chats viewable by participants"
  on public.chats for select to authenticated
  using (public.can_access_book_chat(id));

create or replace function public.update_chat_timestamp_on_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.chats
  set updated_at = new.created_at
  where id = new.chat_id;
  return new;
end;
$$;
drop trigger if exists messages_update_chat_timestamp on public.messages;
create trigger messages_update_chat_timestamp
after insert on public.messages
for each row execute function public.update_chat_timestamp_on_message();

drop policy if exists "Messages viewable by chat participants" on public.messages;
drop policy if exists "Participants can insert messages" on public.messages;
revoke all on public.messages from public, anon, authenticated;
revoke insert (id, chat_id, sender_id, body, created_at),
  update (id, chat_id, sender_id, body, created_at),
  delete on public.messages from public, anon, authenticated;
grant select on public.messages to authenticated;
create policy "Messages viewable by chat participants"
  on public.messages for select to authenticated
  using (public.can_access_book_chat(chat_id));
drop policy if exists "Participants can insert messages" on public.messages;
create policy "Participants can insert messages"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and char_length(btrim(body)) between 1 and 2000
    and public.can_access_book_chat(chat_id)
  );
revoke insert (id, chat_id, sender_id, body, created_at) on public.messages from authenticated;
grant insert (chat_id, sender_id, body) on public.messages to authenticated;

create table if not exists public.book_reviews (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references public.exchange_requests(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  communication_rating smallint not null check (communication_rating between 1 and 5),
  reliability_rating smallint not null check (reliability_rating between 1 and 5),
  description_rating smallint not null check (description_rating between 1 and 5),
  comment text check (comment is null or char_length(btrim(comment)) <= 600),
  created_at timestamptz not null default now(),
  constraint book_reviews_no_self_review check (reviewer_id <> reviewee_id),
  constraint book_reviews_one_per_interaction_reviewer unique (interaction_id, reviewer_id)
);
create index if not exists book_reviews_reviewee_created_idx
  on public.book_reviews (reviewee_id, created_at desc);
alter table public.book_reviews enable row level security;
revoke all on public.book_reviews from public, anon, authenticated;
revoke insert (id, interaction_id, book_id, reviewer_id, reviewee_id, rating, communication_rating, reliability_rating, description_rating, comment, created_at),
  update (id, interaction_id, book_id, reviewer_id, reviewee_id, rating, communication_rating, reliability_rating, description_rating, comment, created_at),
  delete on public.book_reviews from public, anon, authenticated;
drop policy if exists "Public can read community reviews" on public.book_reviews;

create or replace view public.public_member_reviews
with (security_barrier = true)
as
select
  review.id,
  review.reviewee_id,
  coalesce(profile.full_name, 'Thành viên') as reviewer_name,
  review.rating,
  review.communication_rating,
  review.reliability_rating,
  review.description_rating,
  review.comment,
  review.created_at
from public.book_reviews as review
left join public.public_profiles as profile on profile.id = review.reviewer_id;
grant select on public.public_member_reviews to anon, authenticated;

create or replace function public.get_my_reviewed_interactions(p_interaction_ids uuid[])
returns table (interaction_id uuid)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select review.interaction_id
  from public.book_reviews as review
  where review.reviewer_id = auth.uid()
    and review.interaction_id = any(coalesce(p_interaction_ids, array[]::uuid[]));
$$;
revoke all on function public.get_my_reviewed_interactions(uuid[]) from public, anon;
grant execute on function public.get_my_reviewed_interactions(uuid[]) to authenticated;

create or replace function public.create_exchange_review(
  p_interaction_id uuid,
  p_rating smallint,
  p_communication_rating smallint,
  p_reliability_rating smallint,
  p_description_rating smallint,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  request_row public.exchange_requests%rowtype;
  target_user uuid;
  created_review_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;
  select * into request_row
  from public.exchange_requests
  where id = p_interaction_id and status = 'completed';
  if not found or actor_id not in (request_row.owner_id, request_row.requester_id) then
    raise exception 'A completed interaction is required to review';
  end if;
  target_user := case
    when actor_id = request_row.owner_id then request_row.requester_id
    else request_row.owner_id
  end;
  if char_length(btrim(coalesce(p_comment, ''))) > 600 then
    raise exception 'Review text is too long';
  end if;

  insert into public.book_reviews (
    interaction_id, book_id, reviewer_id, reviewee_id, rating,
    communication_rating, reliability_rating, description_rating, comment
  ) values (
    request_row.id, request_row.book_id, actor_id, target_user, p_rating,
    p_communication_rating, p_reliability_rating, p_description_rating,
    nullif(btrim(p_comment), '')
  )
  returning id into created_review_id;
  return created_review_id;
end;
$$;
revoke all on function public.create_exchange_review(uuid, smallint, smallint, smallint, smallint, text) from public, anon;
grant execute on function public.create_exchange_review(uuid, smallint, smallint, smallint, smallint, text) to authenticated;

create or replace view public.public_member_trust
with (security_barrier = true)
as
with completed_participants as (
  select id as interaction_id, requester_id as member_id
  from public.exchange_requests where status = 'completed'
  union all
  select id as interaction_id, owner_id as member_id
  from public.exchange_requests where status = 'completed'
),
interaction_totals as (
  select member_id, count(*)::bigint as completed_interactions
  from completed_participants
  group by member_id
),
review_totals as (
  select
    reviewee_id as member_id,
    count(*)::bigint as review_count,
    round(avg(rating)::numeric, 1) as average_rating
  from public.book_reviews
  group by reviewee_id
)
select
  totals.member_id,
  totals.completed_interactions,
  coalesce(reviews.review_count, 0)::bigint as review_count,
  reviews.average_rating
from interaction_totals as totals
left join review_totals as reviews on reviews.member_id = totals.member_id;
grant select on public.public_member_trust to anon, authenticated;

create or replace view public.public_books
with (security_barrier = true)
as
select
  b.id,
  b.owner_id,
  b.owner_name,
  b.title,
  b.author,
  b.category,
  b.condition,
  b.exchange_type,
  b.description,
  b.image_urls,
  case when b.latitude is null then null else round(b.latitude::numeric, 2)::double precision end as latitude,
  case when b.longitude is null then null else round(b.longitude::numeric, 2)::double precision end as longitude,
  b.contact_phone,
  b.contact_email,
  b.contact_zalo_url,
  b.contact_messenger_url,
  b.status,
  b.created_at,
  b.updated_at
from public.books as b;
grant select on public.public_books to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object or undefined_object then null;
end
$$;

revoke all on public.books from public, anon, authenticated;
revoke select (latitude, longitude) on public.books from public, anon, authenticated;
grant select (
  id, owner_id, owner_name, title, author, category, condition, exchange_type,
  description, image_urls, contact_phone, contact_email, contact_zalo_url,
  contact_messenger_url, status, created_at, updated_at
) on public.books to anon, authenticated;
grant insert (
  owner_id, owner_name, title, author, category, condition, exchange_type,
  description, image_urls, latitude, longitude, contact_phone, contact_email,
  contact_zalo_url, contact_messenger_url, status, created_at, updated_at
) on public.books to authenticated;
grant update (
  owner_name, title, author, category, condition, exchange_type, description,
  image_urls, latitude, longitude, contact_phone, contact_email,
  contact_zalo_url, contact_messenger_url, status, updated_at
) on public.books to authenticated;
grant delete on public.books to authenticated;

drop policy if exists "Trusted staff can moderate books" on public.books;
drop policy if exists "Trusted staff can remove books" on public.books;
create policy "Trusted staff can remove books"
  on public.books for delete to authenticated
  using (public.has_app_role(array['moderator', 'admin', 'owner']::text[]));

revoke update on public.book_reports from public, anon, authenticated;
revoke update (id, reporter_id, book_id, reason, details, created_at, status, reviewed_at, reviewed_by)
  on public.book_reports from public, anon, authenticated;
grant update (status) on public.book_reports to authenticated;

notify pgrst, 'reload schema';
commit;
