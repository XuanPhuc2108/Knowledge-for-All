begin;

alter table public.borrowing_requests
  add column if not exists closed_at timestamptz,
  add column if not exists expires_at timestamptz;

create table if not exists public.borrowing_request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.borrowing_requests(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.borrowing_reminder_deliveries (
  id bigint generated always as identity primary key,
  loan_id uuid not null references public.book_loans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reminder_key text not null,
  delivered_at timestamptz not null default now(),
  unique (loan_id, user_id, reminder_key)
);

alter table public.borrowing_request_events enable row level security;
alter table public.borrowing_reminder_deliveries enable row level security;

revoke all on public.borrowing_request_events, public.borrowing_reminder_deliveries
  from public, anon, authenticated;

drop policy if exists "Request participants can view request events" on public.borrowing_request_events;
create policy "Request participants can view request events"
  on public.borrowing_request_events for select to authenticated
  using (exists (
    select 1 from public.borrowing_requests r
    where r.id = request_id and r.requester_id = auth.uid()
  ));

drop policy if exists "Users can update own notifications" on public.in_app_notifications;
create policy "Users can update own notifications"
  on public.in_app_notifications for update to authenticated
  using (user_id=auth.uid())
  with check (user_id=auth.uid());
revoke insert,update,delete on public.in_app_notifications
  from public, anon, authenticated;
grant select on public.in_app_notifications to authenticated;
grant update(read_at) on public.in_app_notifications to authenticated;

create or replace function public.update_borrowing_request(
  p_request_id uuid,
  p_action text,
  p_title text default null,
  p_author text default null,
  p_isbn text default null,
  p_description text default null,
  p_desired_start_date date default null,
  p_duration_days integer default null,
  p_expected_return_date date default null,
  p_pickup_area text default null,
  p_notes text default null
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_request public.borrowing_requests%rowtype;
  v_next_status text;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;

  select * into v_request
  from public.borrowing_requests
  where id = p_request_id
  for update;

  if v_request.id is null then raise exception 'Request not found'; end if;
  if v_request.requester_id <> v_actor then raise exception 'Only the requester can manage this request'; end if;

  if p_action = 'edit' then
    if v_request.status not in ('searching','has_offer') then
      raise exception 'Only an open request can be edited';
    end if;
    if char_length(btrim(coalesce(p_title,''))) < 2 or char_length(p_title) > 200 then
      raise exception 'Invalid request title';
    end if;
    if p_duration_days is not null and p_duration_days not between 1 and 365 then
      raise exception 'Invalid duration';
    end if;
    if p_desired_start_date is not null and p_expected_return_date is not null
       and p_expected_return_date < p_desired_start_date then
      raise exception 'Invalid return date';
    end if;

    update public.borrowing_requests
    set title=btrim(p_title),
        author=nullif(btrim(coalesce(p_author,'')),''),
        isbn=nullif(btrim(coalesce(p_isbn,'')),''),
        description=nullif(btrim(coalesce(p_description,'')),''),
        desired_start_date=p_desired_start_date,
        duration_days=p_duration_days,
        expected_return_date=p_expected_return_date,
        pickup_area=nullif(btrim(coalesce(p_pickup_area,'')),''),
        notes=nullif(btrim(coalesce(p_notes,'')),''),
        updated_at=now()
    where id=p_request_id;
    v_next_status := v_request.status;

  elsif p_action = 'cancel' then
    if v_request.status not in ('searching','has_offer','confirmed') then
      raise exception 'This request cannot be cancelled';
    end if;
    v_next_status := 'cancelled';
    update public.borrowing_requests
    set status=v_next_status, closed_at=now(), updated_at=now()
    where id=p_request_id;
    update public.borrowing_offers
    set status='cancelled', updated_at=now()
    where request_id=p_request_id and status='pending';

  elsif p_action = 'close' then
    if v_request.status not in ('confirmed','fulfilled') then
      raise exception 'Only a confirmed or fulfilled request can be closed';
    end if;
    v_next_status := 'closed';
    update public.borrowing_requests
    set status=v_next_status, closed_at=now(), updated_at=now()
    where id=p_request_id;

  elsif p_action = 'reopen' then
    if v_request.status not in ('cancelled','closed','expired') then
      raise exception 'This request cannot be reopened';
    end if;
    if exists (
      select 1 from public.book_loans
      where request_id=p_request_id and status in ('active','awaiting_return_confirmation')
    ) then raise exception 'A request with an active loan cannot be reopened'; end if;
    v_next_status := 'searching';
    update public.borrowing_requests
    set status=v_next_status, closed_at=null, updated_at=now()
    where id=p_request_id;

  else
    raise exception 'Invalid request action';
  end if;

  insert into public.borrowing_request_events(
    request_id,actor_id,event_type,from_status,to_status,details
  ) values(
    p_request_id,v_actor,p_action,v_request.status,v_next_status,
    jsonb_build_object('action',p_action)
  );
end if;
$$;
revoke all on function public.update_borrowing_request(uuid,text,text,text,text,text,date,integer,date,text,text) from public, anon;
grant execute on function public.update_borrowing_request(uuid,text,text,text,text,text,date,integer,date,text,text) to authenticated;

create or replace function public.respond_borrowing_offer(p_offer_id uuid,p_action text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_offer public.borrowing_offers%rowtype;
  v_request public.borrowing_requests%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;

  select * into v_offer
  from public.borrowing_offers
  where id=p_offer_id
  for update;
  if v_offer.id is null then raise exception 'Offer not found'; end if;

  select * into v_request
  from public.borrowing_requests
  where id=v_offer.request_id
  for update;

  if p_action='withdraw' then
    if v_offer.lender_id<>v_actor then raise exception 'Only the lender can withdraw this offer'; end if;
    if v_offer.status<> 'pending' then raise exception 'Only a pending offer can be withdrawn'; end if;
    update public.borrowing_offers set status='withdrawn',updated_at=now() where id=p_offer_id;
    if not exists (
      select 1 from public.borrowing_offers
      where request_id=v_offer.request_id and status='pending'
    ) then
      update public.borrowing_requests
      set status=case when exists (
        select 1 from public.book_loans where request_id=v_offer.request_id
          and status in ('active','awaiting_return_confirmation','completed')
      ) then 'confirmed' else 'searching' end,
      updated_at=now()
      where id=v_offer.request_id;
    end if;

  elsif p_action='reject' then
    if v_request.requester_id<>v_actor then raise exception 'Only the requester can reject this offer'; end if;
    if v_offer.status<> 'pending' then raise exception 'Only a pending offer can be rejected'; end if;
    update public.borrowing_offers set status='rejected',updated_at=now() where id=p_offer_id;
    if not exists (
      select 1 from public.borrowing_offers
      where request_id=v_offer.request_id and status='pending'
    ) then
      update public.borrowing_requests set status='searching',updated_at=now()
      where id=v_offer.request_id;
    end if;

  else
    raise exception 'Invalid offer action';
  end if;

  insert into public.in_app_notifications(user_id,type,title,body,link)
  values(
    case when p_action='withdraw' then v_request.requester_id else v_offer.lender_id end,
    case when p_action='withdraw' then 'borrowing_offer_withdrawn' else 'borrowing_offer_rejected' end,
    case when p_action='withdraw' then 'Đề nghị cho mượn đã được rút' else 'Đề nghị cho mượn đã bị từ chối' end,
    'Trạng thái đề nghị đã được cập nhật.', '/app/borrowing'
  );
end if;
$$;
revoke all on function public.respond_borrowing_offer(uuid,text) from public, anon;
grant execute on function public.respond_borrowing_offer(uuid,text) to authenticated;

create or replace function public.accept_borrowing_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_offer public.borrowing_offers%rowtype;
  v_request public.borrowing_requests%rowtype;
  v_loan_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;

  select * into v_offer
  from public.borrowing_offers
  where id=p_offer_id
  for update;
  if v_offer.id is null then raise exception 'Offer not found'; end if;

  select * into v_request
  from public.borrowing_requests
  where id=v_offer.request_id
  for update;
  if v_request.requester_id<>v_actor then raise exception 'Only the requester can accept'; end if;
  if v_offer.status<> 'pending' then raise exception 'Offer is no longer pending'; end if;
  if v_request.status not in ('searching','has_offer') then raise exception 'Request is not open'; end if;
  if exists (
    select 1 from public.book_loans
    where request_id=v_offer.request_id
      and status in ('active','awaiting_return_confirmation')
  ) then raise exception 'An active loan already exists'; end if;

  update public.borrowing_offers
  set status='rejected',updated_at=now()
  where request_id=v_offer.request_id and status='pending';

  update public.borrowing_offers
  set status='accepted',updated_at=now()
  where id=p_offer_id;

  update public.borrowing_requests
  set status='confirmed',updated_at=now()
  where id=v_offer.request_id;

  insert into public.book_loans(
    request_id,offer_id,borrower_id,lender_id,start_date,expected_return_date,status
  ) values(
    v_offer.request_id,p_offer_id,v_request.requester_id,v_offer.lender_id,
    v_offer.offered_start_date,v_offer.offered_end_date,'active'
  ) returning id into v_loan_id;

  insert into public.in_app_notifications(user_id,type,title,body,link)
  values(v_offer.lender_id,'borrowing_confirmed','Đề nghị cho mượn đã được xác nhận',
         'Người cần mượn đã đồng ý với thời gian bạn đề nghị.', '/app/borrowing');
  return v_loan_id;
end;
$$;
revoke all on function public.accept_borrowing_offer(uuid) from public, anon;
grant execute on function public.accept_borrowing_offer(uuid) to authenticated;

create or replace function public.process_borrowing_reminders()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_processed integer := 0;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_loan record;
  v_days integer;
  v_key text;
  v_title text;
  v_body text;
begin
  for v_loan in
    select l.*, r.title
    from public.book_loans l
    join public.borrowing_requests r on r.id=l.request_id
    where l.status='active'
  loop
    v_days := v_loan.expected_return_date - v_today;
    if v_days < 0 then
      v_key := 'overdue-'||v_loan.expected_return_date;
      v_title := 'Sách đã quá hạn trả';
      v_body := format('Sách đã quá hạn trả %s ngày.', abs(v_days));
    elsif v_days = 0 then
      v_key := 'due_today-'||v_loan.expected_return_date;
      v_title := 'Đến hạn trả sách hôm nay';
      v_body := 'Hôm nay là hạn trả sách.';
    elsif v_days = 1 then
      v_key := 'due_1-'||v_loan.expected_return_date;
      v_title := 'Còn 1 ngày đến hạn trả sách';
      v_body := 'Bạn còn 1 ngày để trả sách.';
    elsif v_days = 3 then
      v_key := 'due_3-'||v_loan.expected_return_date;
      v_title := 'Còn 3 ngày đến hạn trả sách';
      v_body := 'Bạn còn 3 ngày đến hạn trả sách.';
    else
      continue;
    end if;

    if not exists (
      select 1 from public.borrowing_reminder_deliveries
      where loan_id=v_loan.id and user_id=v_loan.borrower_id and reminder_key=v_key
    ) then
      insert into public.borrowing_reminder_deliveries(
        loan_id,user_id,reminder_key
      ) values(v_loan.id,v_loan.borrower_id,v_key);
      insert into public.in_app_notifications(
        user_id,type,title,body,link
      ) values(
        v_loan.borrower_id,'loan_reminder',v_title,v_body,'/app/borrowing'
      );
      v_processed := v_processed+1;
    end if;
  end loop;
  return v_processed;
end;
$$;
revoke all on function public.process_borrowing_reminders() from public, anon, authenticated;
grant execute on function public.process_borrowing_reminders() to service_role;

create or replace function public.get_my_borrowing_dashboard()
returns table (
  loan_id uuid,
  request_id uuid,
  borrower_id uuid,
  lender_id uuid,
  start_date date,
  expected_return_date date,
  actual_return_date date,
  loan_status text,
  request_title text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select l.id,l.request_id,l.borrower_id,l.lender_id,l.start_date,
         l.expected_return_date,l.actual_return_date,l.status,r.title
  from public.book_loans l
  join public.borrowing_requests r on r.id=l.request_id
  where l.borrower_id=auth.uid() or l.lender_id=auth.uid();
$$;
revoke all on function public.get_my_borrowing_dashboard() from public, anon;
grant execute on function public.get_my_borrowing_dashboard() to authenticated;

commit;
