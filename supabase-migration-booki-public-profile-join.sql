begin;

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
  b.updated_at,
  profile.full_name as public_owner_name,
  profile.avatar_url as public_owner_avatar_url,
  profile.area_label as public_owner_area_label,
  profile.contact_phone as public_owner_contact_phone,
  profile.contact_email as public_owner_contact_email
from public.books as b
left join public.public_profiles as profile on profile.id = b.owner_id;

grant select on public.public_books to anon, authenticated;
notify pgrst, 'reload schema';
commit;
