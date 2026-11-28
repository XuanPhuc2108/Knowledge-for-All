begin;

create table if not exists public.borrowing_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 200),
  author text check (author is null or char_length(author) <= 200),
  isbn text check (isbn is null or char_length(btrim(isbn)) <= 32),
  cover_image_url text,
  description text,
  desired_start_date date,
  duration_days integer check (duration_days is null or duration_days between 1 and 365),
  expected_return_date date,
  pickup_area text,
  notes text,
  status text not null default 'searching'
    check (status in ('searching','has_offer','confirmed','fulfilled','closed','expired','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.borrowing_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.borrowing_requests(id) on delete cascade,
  lender_id uuid not null references public.profiles(id) on delete cascade,
  message text check (message is null or char_length(message) <= 1000),
  offered_start_date date not null,
  offered_end_date date not null,
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','withdrawn','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (offered_end_date >= offered_start_date)
);

create table if not exists public.book_loans (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.borrowing_requests(id) on delete cascade,
  offer_id uuid not null references public.borrowing_offers(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  lender_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  expected_return_date date not null,
  actual_return_date date,
  status text not null default 'active'
    check (status in ('active','awaiting_return_confirmation','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (expected_return_date >= start_date),
  check (borrower_id <> lender_id)
);

create table if not exists public.loan_extensions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.book_loans(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requested_return_date date not null,
  reason text,
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists borrowing_requests_status_created_idx
  on public.borrowing_requests(status, created_at desc);
create index if not exists borrowing_requests_requester_idx
  on public.borrowing_requests(requester_id, created_at desc);
create index if not exists borrowing_offers_request_status_idx
  on public.borrowing_offers(request_id, status, created_at desc);
create index if not exists book_loans_borrower_status_idx
  on public.book_loans(borrower_id, status, expected_return_date);
create index if not exists book_loans_lender_status_idx
  on public.book_loans(lender_id, status, expected_return_date);
create index if not exists loan_extensions_pending_idx
  on public.loan_extensions(loan_id, status);
create index if not exists in_app_notifications_user_idx
  on public.in_app_notifications(user_id, created_at desc);

create unique index if not exists borrowing_offers_one_active_per_lender
  on public.borrowing_offers(request_id, lender_id) where status in ('pending','accepted');
create unique index if not exists book_loans_one_active_per_request
  on public.book_loans(request_id) where status in ('active','awaiting_return_confirmation');

alter table public.borrowing_requests enable row level security;
alter table public.borrowing_offers enable row level security;
alter table public.book_loans enable row level security;
alter table public.loan_extensions enable row level security;
alter table public.in_app_notifications enable row level security;

revoke all on public.borrowing_requests, public.borrowing_offers, public.book_loans,
  public.loan_extensions, public.in_app_notifications
  from public, anon, authenticated;
grant select on public.borrowing_requests to anon, authenticated;

drop policy if exists "Borrowing requests are public" on public.borrowing_requests;
create policy "Borrowing requests are public"
  on public.borrowing_requests for select to anon, authenticated using (true);

drop policy if exists "Offer participants can read offers" on public.borrowing_offers;
create policy "Offer participants can read offers"
  on public.borrowing_offers for select to authenticated
  using (lender_id = auth.uid() or exists (
    select 1 from public.borrowing_requests r
    where r.id = request_id and r.requester_id = auth.uid()
  ));

drop policy if exists "Loan participants can read loans" on public.book_loans;
create policy "Loan participants can read loans"
  on public.book_loans for select to authenticated
  using (borrower_id = auth.uid() or lender_id = auth.uid());

drop policy if exists "Loan participants can read extensions" on public.loan_extensions;
create policy "Loan participants can read extensions"
  on public.loan_extensions for select to authenticated
  using (exists (
    select 1 from public.book_loans l
    where l.id = loan_id and (l.borrower_id = auth.uid() or l.lender_id = auth.uid())
  ));

drop policy if exists "Users can read own notifications" on public.in_app_notifications;
create policy "Users can read own notifications"
  on public.in_app_notifications for select to authenticated
  using (user_id = auth.uid());

create or replace function public.create_borrowing_request(
  p_title text,
  p_author text default null,
  p_isbn text default null,
  p_cover_image_url text default null,
  p_description text default null,
  p_desired_start_date date default null,
  p_duration_days integer default null,
  p_expected_return_date date default null,
  p_pickup_area text default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(coalesce(p_title,''))) < 2 then raise exception 'Title is required'; end if;
  if p_duration_days is not null and p_duration_days not between 1 and 365 then
    raise exception 'Invalid duration';
  end if;
  if p_expected_return_date is not null and p_desired_start_date is not null
     and p_expected_return_date < p_desired_start_date then
    raise exception 'Invalid return date';
  end if;
  insert into public.borrowing_requests (
    requester_id,title,author,isbn,cover_image_url,description,
    desired_start_date,duration_days,expected_return_date,pickup_area,notes
  ) values (
    v_actor,btrim(p_title),nullif(btrim(coalesce(p_author,'')),''),
    nullif(btrim(coalesce(p_isbn,'')),''),p_cover_image_url,
    nullif(btrim(coalesce(p_description,'')),''),
    p_desired_start_date,p_duration_days,p_expected_return_date,
    nullif(btrim(coalesce(p_pickup_area,'')),''),nullif(btrim(coalesce(p_notes,'')),'')
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_borrowing_request(text,text,text,text,text,date,integer,date,text,text) from public, anon;
grant execute on function public.create_borrowing_request(text,text,text,text,text,date,integer,date,text,text) to authenticated;

create or replace function public.create_borrowing_offer(
  p_request_id uuid,
  p_message text,
  p_start_date date,
  p_end_date date
) returns uuid
language plpgsql
security definer set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_request public.borrowing_requests%rowtype;
  v_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select * into v_request from public.borrowing_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Request not found'; end if;
  if v_request.requester_id=v_actor then raise exception 'Cannot offer to your own request'; end if;
  if v_request.status not in ('searching','has_offer') then raise exception 'Request is not open'; end if;
  if p_end_date < p_start_date then raise exception 'Invalid offered period'; end if;
  if exists (
    select 1 from public.borrowing_offers
    where request_id=p_request_id and lender_id=v_actor and status='pending'
  ) then raise exception 'An active offer already exists'; end if;
  insert into public.borrowing_offers(request_id,lender_id,message,offered_start_date,offered_end_date)
  values(p_request_id,v_actor,nullif(btrim(coalesce(p_message,'')),''),p_start_date,p_end_date)
  returning id into v_id;
  update public.borrowing_requests set status='has_offer', updated_at=now() where id=p_request_id;
  insert into public.in_app_notifications(user_id,type,title,body,link)
  values(v_request.requester_id,'borrowing_offer','Có người muốn cho bạn mượn sách',
         'Bạn vừa nhận một đề nghị cho mượn mới.', '/app/borrowing');
  return v_id;
end;
$$;
revoke all on function public.create_borrowing_offer(uuid,text,date,date) from public, anon;
grant execute on function public.create_borrowing_offer(uuid,text,date,date) to authenticated;

create or replace function public.accept_borrowing_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_offer public.borrowing_offers%rowtype;
  v_request public.borrowing_requests%rowtype;
  v_loan_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select * into v_offer from public.borrowing_offers where id=p_offer_id for update;
  if v_offer.id is null then raise exception 'Offer not found'; end if;
  select * into v_request from public.borrowing_requests where id=v_offer.request_id for update;
  if v_request.requester_id<>v_actor then raise exception 'Only the requester can accept'; end if;
  if v_offer.status<> 'pending' or v_request.status not in ('searching','has_offer') then
    raise exception 'Offer cannot be accepted';
  end if;
  update public.borrowing_offers set status='rejected', updated_at=now()
    where request_id=v_offer.request_id and id<>p_offer_id and status='pending';
  update public.borrowing_offers set status='accepted', updated_at=now() where id=p_offer_id;
  update public.borrowing_requests set status='confirmed', updated_at=now() where id=v_offer.request_id;
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

create or replace function public.request_loan_extension(p_loan_id uuid,p_requested_date date,p_reason text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor uuid:=auth.uid(); v_loan public.book_loans%rowtype; v_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select * into v_loan from public.book_loans where id=p_loan_id for update;
  if v_loan.id is null then raise exception 'Loan not found'; end if;
  if v_loan.borrower_id<>v_actor then raise exception 'Only the borrower can request an extension'; end if;
  if v_loan.status not in ('active','awaiting_return_confirmation') then raise exception 'Loan is not active'; end if;
  if p_requested_date<=v_loan.expected_return_date then raise exception 'Requested date must extend the deadline'; end if;
  if exists(select 1 from public.loan_extensions where loan_id=p_loan_id and status='pending') then
    raise exception 'A pending extension already exists';
  end if;
  insert into public.loan_extensions(loan_id,requester_id,requested_return_date,reason)
  values(p_loan_id,v_actor,p_requested_date,nullif(btrim(coalesce(p_reason,'')),'')) returning id into v_id;
  insert into public.in_app_notifications(user_id,type,title,body,link)
  values(v_loan.lender_id,'loan_extension','Có yêu cầu gia hạn mượn sách',
         'Người mượn đã gửi yêu cầu gia hạn thời gian trả.', '/app/borrowing');
  return v_id;
end; $$;
revoke all on function public.request_loan_extension(uuid,date,text) from public, anon;
grant execute on function public.request_loan_extension(uuid,date,text) to authenticated;

create or replace function public.respond_loan_extension(p_extension_id uuid,p_accept boolean)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor uuid:=auth.uid(); v_extension public.loan_extensions%rowtype; v_loan public.book_loans%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select * into v_extension from public.loan_extensions where id=p_extension_id for update;
  if v_extension.id is null then raise exception 'Extension not found'; end if;
  select * into v_loan from public.book_loans where id=v_extension.loan_id for update;
  if v_loan.lender_id<>v_actor then raise exception 'Only the lender can respond'; end if;
  if v_extension.status<> 'pending' then raise exception 'Extension already resolved'; end if;
  if p_accept then
    update public.book_loans set expected_return_date=v_extension.requested_return_date,updated_at=now()
      where id=v_loan.id;
  end if;
  update public.loan_extensions set status=case when p_accept then 'accepted' else 'rejected' end,
    responded_at=now() where id=p_extension_id;
  insert into public.in_app_notifications(user_id,type,title,body,link)
  values(v_loan.borrower_id,case when p_accept then 'extension_accepted' else 'extension_rejected' end,
         case when p_accept then 'Gia hạn đã được chấp nhận' else 'Gia hạn không được chấp nhận' end,
         case when p_accept then 'Ngày hẹn trả mới đã được cập nhật.' else 'Ngày hẹn trả không thay đổi.' end,
         '/app/borrowing');
end; $$;
revoke all on function public.respond_loan_extension(uuid,boolean) from public, anon;
grant execute on function public.respond_loan_extension(uuid,boolean) to authenticated;

create or replace function public.mark_loan_returned(p_loan_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor uuid:=auth.uid(); v_loan public.book_loans%rowtype;
begin
  select * into v_loan from public.book_loans where id=p_loan_id for update;
  if v_loan.id is null then raise exception 'Loan not found'; end if;
  if v_loan.borrower_id<>v_actor then raise exception 'Only the borrower can mark return'; end if;
  if v_loan.status<> 'active' then raise exception 'Loan cannot be marked returned'; end if;
  update public.book_loans set status='awaiting_return_confirmation',actual_return_date=current_date,updated_at=now()
    where id=p_loan_id;
  insert into public.in_app_notifications(user_id,type,title,body,link)
  values(v_loan.lender_id,'return_confirmation','Sách đã được đánh dấu đã trả',
         'Người mượn đã đánh dấu trả sách. Hãy xác nhận đã nhận lại sách.', '/app/borrowing');
end; $$;
revoke all on function public.mark_loan_returned(uuid) from public, anon;
grant execute on function public.mark_loan_returned(uuid) to authenticated;

create or replace function public.confirm_loan_return(p_loan_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor uuid:=auth.uid(); v_loan public.book_loans%rowtype;
begin
  select * into v_loan from public.book_loans where id=p_loan_id for update;
  if v_loan.id is null then raise exception 'Loan not found'; end if;
  if v_loan.lender_id<>v_actor then raise exception 'Only the lender can confirm receipt'; end if;
  if v_loan.status<> 'awaiting_return_confirmation' then raise exception 'Return is not awaiting confirmation'; end if;
  update public.book_loans set status='completed',completed_at=now(),updated_at=now() where id=p_loan_id;
  update public.borrowing_requests set status='fulfilled',updated_at=now() where id=v_loan.request_id;
end; $$;
revoke all on function public.confirm_loan_return(uuid) from public, anon;
grant execute on function public.confirm_loan_return(uuid) to authenticated;

commit;
