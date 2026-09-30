-- Optional per-listing Zalo and Messenger contact links.
-- These links are only public when the book owner explicitly adds them to a listing.
alter table public.books
  add column if not exists contact_zalo_url text,
  add column if not exists contact_messenger_url text;
