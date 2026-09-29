begin;

create table if not exists public.book_favorites (
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index if not exists book_favorites_book_id_idx
  on public.book_favorites (book_id);

alter table public.book_favorites enable row level security;

drop policy if exists "Users can view own book favorites" on public.book_favorites;
drop policy if exists "Users can save own book favorites" on public.book_favorites;
drop policy if exists "Users can remove own book favorites" on public.book_favorites;

create policy "Users can view own book favorites"
  on public.book_favorites for select
  using (auth.uid() = user_id);

create policy "Users can save own book favorites"
  on public.book_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own book favorites"
  on public.book_favorites for delete
  using (auth.uid() = user_id);

grant select, insert, delete on table public.book_favorites to authenticated;

notify pgrst, 'reload schema';

commit;
