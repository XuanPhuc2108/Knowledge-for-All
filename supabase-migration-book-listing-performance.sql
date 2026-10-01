create index concurrently if not exists books_created_at_id_desc_idx
  on public.books (created_at desc, id desc);
