-- Run once in Supabase SQL Editor, after the owner's verified account exists
-- and after supabase-migration-booki-product-completion.sql has been applied.
do $$
declare
  owner_user_id uuid;
begin
  select id
    into owner_user_id
  from auth.users
  where lower(email) = lower('nguyenxuanphucdongthap123@gmail.com')
    and email_confirmed_at is not null;

  if owner_user_id is null then
    raise exception 'No verified account found for the configured Booki owner email';
  end if;

  if exists (
    select 1 from public.app_user_roles
    where role = 'owner' and user_id <> owner_user_id
  ) then
    raise exception 'An owner is already assigned; review app_user_roles before bootstrapping another owner';
  end if;

  insert into public.app_user_roles (user_id, role)
  values (owner_user_id, 'owner')
  on conflict (user_id) do update set role = 'owner';
end
$$;
