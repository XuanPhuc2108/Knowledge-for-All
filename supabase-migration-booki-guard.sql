begin;

alter table public.books
  add column if not exists moderation_status text not null default 'needs_review',
  add column if not exists risk_level text not null default 'MEDIUM',
  add column if not exists risk_reasons text[] not null default '{}',
  add column if not exists moderation_source text not null default 'RULES',
  add column if not exists moderation_decision text,
  add column if not exists moderation_reviewed_at timestamptz,
  add column if not exists moderation_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists image_review_status text not null default 'manual_review';

grant select (moderation_status) on public.books to authenticated;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'books_moderation_status_check' and conrelid = 'public.books'::regclass) then
    alter table public.books add constraint books_moderation_status_check
      check (moderation_status in ('needs_review', 'cleared'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'books_risk_level_check' and conrelid = 'public.books'::regclass) then
    alter table public.books add constraint books_risk_level_check
      check (risk_level in ('LOW', 'MEDIUM', 'HIGH'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'books_moderation_source_check' and conrelid = 'public.books'::regclass) then
    alter table public.books add constraint books_moderation_source_check
      check (moderation_source in ('RULES', 'LOCAL_MODEL', 'FUTURE_PROVIDER'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'books_moderation_decision_check' and conrelid = 'public.books'::regclass) then
    alter table public.books add constraint books_moderation_decision_check
      check (moderation_decision is null or moderation_decision in ('kept', 'marked_safe'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'books_image_review_status_check' and conrelid = 'public.books'::regclass) then
    alter table public.books add constraint books_image_review_status_check
      check (image_review_status in ('manual_review', 'not_applicable'));
  end if;
end
$$;

create index if not exists books_guard_queue_idx
  on public.books (moderation_status, risk_level, created_at desc);
create index if not exists books_guard_duplicate_idx
  on public.books (owner_id, lower(btrim(title)), lower(btrim(coalesce(author, ''))));

create or replace function public.assess_book_guard(
  p_owner_id uuid,
  p_title text,
  p_author text,
  p_category text,
  p_description text,
  p_book_id uuid default null
)
returns table (risk_level text, moderation_status text, risk_reasons text[])
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_content text := concat_ws(' ', p_title, p_author, p_category, p_description);
  v_reasons text[] := array[]::text[];
  v_weight integer := 0;
  v_link_count integer := 0;
  v_promotion_count integer := 0;
  v_phone_count integer := 0;
  v_email_count integer := 0;
  v_word_count integer := 0;
  v_distinct_word_count integer := 0;
begin
  select count(*) into v_link_count
  from regexp_matches(v_content, '(https?://|www\.)', 'gi');

  if v_link_count > 0 then
    if v_link_count > 1 then
      v_reasons := array_append(v_reasons, 'Nội dung có nhiều đường dẫn bên ngoài.');
      v_weight := v_weight + 2;
    else
      v_reasons := array_append(v_reasons, 'Nội dung có đường dẫn bên ngoài.');
      v_weight := v_weight + 1;
    end if;
  end if;

  if v_content ~* '([[:alnum:]])\1{5,}' then
    v_reasons := array_append(v_reasons, 'Có chuỗi ký tự lặp bất thường.');
    v_weight := v_weight + 2;
  end if;

  select count(*) into v_word_count
  from regexp_split_to_table(lower(coalesce(p_description, '')), '\s+') as word
  where word <> '';

  select count(distinct word) into v_distinct_word_count
  from regexp_split_to_table(lower(coalesce(p_description, '')), '\s+') as word
  where word <> '';

  if v_word_count >= 20 and v_distinct_word_count::numeric / v_word_count < 0.35 then
    v_reasons := array_append(v_reasons, 'Mô tả lặp lại từ ngữ nhiều hơn bình thường.');
    v_weight := v_weight + 1;
  end if;

  if v_content ~* 'mua ngay' then v_promotion_count := v_promotion_count + 1; end if;
  if v_content ~* 'click ngay' then v_promotion_count := v_promotion_count + 1; end if;
  if v_content ~* 'kiếm tiền nhanh' then v_promotion_count := v_promotion_count + 1; end if;
  if v_content ~* 'vay tiền nhanh' then v_promotion_count := v_promotion_count + 1; end if;
  if v_content ~* 'tuyển cộng tác viên' then v_promotion_count := v_promotion_count + 1; end if;
  if v_content ~* 'kiếm tiền tại nhà' then v_promotion_count := v_promotion_count + 1; end if;
  if v_promotion_count > 0 then
    if v_promotion_count > 1 then
      v_reasons := array_append(v_reasons, 'Có nhiều cụm từ quảng bá hoặc kêu gọi bất thường.');
      v_weight := v_weight + 2;
    else
      v_reasons := array_append(v_reasons, 'Có cụm từ quảng bá cần được kiểm tra.');
      v_weight := v_weight + 1;
    end if;
  end if;

  if v_content ~* '(^|[^[:alnum:]])(địt|đụ|fuck|shit)([^[:alnum:]]|$)' then
    v_reasons := array_append(v_reasons, 'Có ngôn từ cần được xem xét trong ngữ cảnh.');
    v_weight := v_weight + 1;
  end if;

  if length(btrim(coalesce(p_title, ''))) < 2
     or lower(btrim(coalesce(p_description, ''))) in ('test', 'asdf', 'qwerty', 'xxx', 'không có gì', 'khong co gi')
  then
    v_reasons := array_append(v_reasons, 'Thông tin sách hoặc mô tả có thể chưa đủ ý nghĩa.');
    v_weight := v_weight + 1;
  elsif length(btrim(coalesce(p_description, ''))) < 12 then
    v_reasons := array_append(v_reasons, 'Mô tả khá ngắn, nên xem lại thông tin trước khi duyệt.');
    v_weight := v_weight + 1;
  end if;

  if p_owner_id is not null
     and p_title is not null
     and exists (
       select 1 from public.books as existing
       where existing.owner_id = p_owner_id
         and existing.id <> coalesce(p_book_id, '00000000-0000-0000-0000-000000000000'::uuid)
         and lower(btrim(existing.title)) = lower(btrim(p_title))
         and lower(btrim(coalesce(existing.author, ''))) = lower(btrim(coalesce(p_author, '')))
     )
  then
    v_reasons := array_append(v_reasons, 'Có bài đăng khác cùng tiêu đề và tác giả cần được đối chiếu.');
    v_weight := v_weight + 2;
  end if;

  select count(*) into v_phone_count
  from regexp_matches(v_content, '(\+?[0-9][0-9 ().-]{7,}[0-9])', 'g');
  select count(*) into v_email_count
  from regexp_matches(v_content, '([[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,})', 'gi');
  if v_phone_count > 1 or v_email_count > 1 then
    v_reasons := array_append(v_reasons, 'Phần mô tả có nhiều chuỗi liên hệ; cần xem thủ công.');
    v_weight := v_weight + 1;
  end if;

  if cardinality(v_reasons) = 0 then
    v_reasons := array_append(v_reasons, 'Chưa phát hiện dấu hiệu đáng ngờ theo các quy tắc hiện có.');
  end if;

  risk_level := case when v_weight >= 3 then 'HIGH' when v_weight > 0 then 'MEDIUM' else 'LOW' end;
  moderation_status := case when risk_level = 'LOW' then 'cleared' else 'needs_review' end;
  risk_reasons := v_reasons;
  return next;
end;
$$;
revoke all on function public.assess_book_guard(uuid, text, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.set_book_guard_assessment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  assessment record;
begin
  if tg_op = 'UPDATE'
     and row(new.owner_id, new.title, new.author, new.category, new.description, new.image_urls)
       is not distinct from row(old.owner_id, old.title, old.author, old.category, old.description, old.image_urls)
  then
    return new;
  end if;

  select * into assessment
  from public.assess_book_guard(new.owner_id, new.title, new.author, new.category, new.description, new.id);

  new.risk_level := assessment.risk_level;
  new.moderation_status := assessment.moderation_status;
  new.risk_reasons := assessment.risk_reasons;
  new.moderation_source := 'RULES';
  new.moderation_decision := null;
  new.moderation_reviewed_at := null;
  new.moderation_reviewed_by := null;
  new.image_review_status := case
    when coalesce(cardinality(new.image_urls), 0) > 0 then 'manual_review'
    else 'not_applicable'
  end;
  return new;
end;
$$;
drop trigger if exists books_set_guard_assessment on public.books;
create trigger books_set_guard_assessment
  before insert or update of owner_id, title, author, category, description, image_urls on public.books
  for each row execute function public.set_book_guard_assessment();

with assessed_books as (
  select
    book.id,
    assessment.risk_level,
    assessment.moderation_status,
    assessment.risk_reasons
  from public.books as book
  cross join lateral public.assess_book_guard(
    book.owner_id,
    book.title,
    book.author,
    book.category,
    book.description,
    book.id
  ) as assessment
)
update public.books as book
set risk_level = assessment.risk_level,
    moderation_status = assessment.moderation_status,
    risk_reasons = assessment.risk_reasons,
    moderation_source = 'RULES',
    moderation_decision = null,
    moderation_reviewed_at = null,
    moderation_reviewed_by = null,
    image_review_status = case
      when coalesce(cardinality(book.image_urls), 0) > 0 then 'manual_review'
      else 'not_applicable'
    end
from assessed_books as assessment
where assessment.id = book.id
  and book.moderation_reviewed_at is null
  and book.moderation_decision is null;

create or replace function public.can_view_book_guard_item(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() = p_owner_id
    or public.has_app_role(array['moderator', 'admin', 'owner']::text[]);
$$;
revoke all on function public.can_view_book_guard_item(uuid) from public;
grant execute on function public.can_view_book_guard_item(uuid) to anon, authenticated;

drop policy if exists "Books are viewable by everyone" on public.books;
create policy "Visible books and trusted reviewers can read books"
  on public.books for select
  using (
    moderation_status = 'cleared'
    or public.can_view_book_guard_item(owner_id)
  );

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
from public.books as b
where b.moderation_status = 'cleared'
   or public.can_view_book_guard_item(b.owner_id);
grant select on public.public_books to anon, authenticated;

create or replace function public.get_book_guard_queue()
returns table (
  book_id uuid,
  owner_id uuid,
  owner_name text,
  title text,
  author text,
  category text,
  description text,
  book_status text,
  created_at timestamptz,
  moderation_status text,
  risk_level text,
  risk_reasons text[],
  moderation_source text,
  moderation_decision text,
  moderation_reviewed_at timestamptz,
  moderation_reviewed_by uuid,
  image_review_status text,
  report_id uuid,
  reporter_id uuid,
  reporter_name text,
  report_reason text,
  report_details text,
  report_status text,
  report_created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null
     or not public.has_app_role(array['moderator', 'admin', 'owner']::text[])
  then
    raise exception 'Not authorized';
  end if;

  return query
  select
    b.id,
    b.owner_id,
    b.owner_name,
    b.title,
    b.author,
    b.category,
    b.description,
    b.status,
    b.created_at,
    b.moderation_status,
    case
      when report.id is not null and report.status in ('pending', 'reviewed') and b.risk_level = 'LOW' then 'MEDIUM'
      else b.risk_level
    end,
    case
      when report.id is not null and report.status in ('pending', 'reviewed') then b.risk_reasons || array[
        case report.reason
          when 'incorrect' then 'Cộng đồng báo thông tin chưa chính xác; cần đối chiếu.'
          when 'unavailable' then 'Cộng đồng báo sách có thể không còn khả dụng; cần xác minh.'
          when 'inappropriate' then 'Cộng đồng đã báo cáo nội dung không phù hợp; cần người kiểm duyệt xem xét.'
          else 'Có báo cáo khác từ cộng đồng; cần xem thêm ngữ cảnh.'
        end
      ]
      else b.risk_reasons
    end,
    b.moderation_source,
    b.moderation_decision,
    b.moderation_reviewed_at,
    b.moderation_reviewed_by,
    b.image_review_status,
    report.id,
    report.reporter_id,
    reporter.full_name,
    report.reason,
    report.details,
    report.status,
    report.created_at
  from public.books as b
  left join lateral (
    select r.id, r.reporter_id, r.reason, r.details, r.status, r.created_at
    from public.book_reports as r
    where r.book_id = b.id
    order by (r.status = 'pending') desc, r.created_at desc
    limit 1
  ) as report on true
  left join public.profiles as reporter on reporter.id = report.reporter_id
  where b.moderation_status = 'needs_review'
     or report.id is not null
  order by
    case
      when b.risk_level = 'HIGH' then 0
      when b.risk_level = 'MEDIUM' or report.status in ('pending', 'reviewed') then 1
      else 2
    end,
    (report.status = 'pending') desc,
    b.created_at desc;
end;
$$;
revoke all on function public.get_book_guard_queue() from public, anon;
grant execute on function public.get_book_guard_queue() to authenticated;

create or replace function public.review_book_guard(p_book_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  reviewed_book public.books%rowtype;
begin
  if auth.uid() is null
     or not public.has_app_role(array['moderator', 'admin', 'owner']::text[])
  then
    raise exception 'Not authorized';
  end if;
  if p_decision is null or p_decision not in ('kept', 'marked_safe') then
    raise exception 'Invalid moderation decision';
  end if;

  update public.books as b
  set moderation_status = 'cleared',
      moderation_decision = p_decision,
      moderation_reviewed_at = now(),
      moderation_reviewed_by = auth.uid()
  where b.id = p_book_id
  returning b.* into reviewed_book;

  if not found then
    raise exception 'Book not found';
  end if;

  insert into public.app_audit_log (actor_id, book_id, event_type, details)
  values (
    auth.uid(),
    reviewed_book.id,
    case when p_decision = 'marked_safe' then 'book.guard_marked_safe' else 'book.guard_kept' end,
    jsonb_build_object('risk_level', reviewed_book.risk_level, 'decision', p_decision)
  );
end;
$$;
revoke all on function public.review_book_guard(uuid, text) from public, anon;
grant execute on function public.review_book_guard(uuid, text) to authenticated;

revoke all on function public.set_book_guard_assessment() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
