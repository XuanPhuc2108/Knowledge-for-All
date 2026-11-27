interface PublicBookCountResult {
  count: number | null
  error: { message: string } | null
}

interface PublicBookCountSource {
  from(table: 'public_books'): {
    select(
      columns: 'id',
      options: { count: 'exact'; head: true },
    ): PromiseLike<PublicBookCountResult>
  }
}

export async function fetchPublicBookCount(source: PublicBookCountSource): Promise<number> {
  const { count, error } = await source
    .from('public_books')
    .select('id', { count: 'exact', head: true })

  if (error) throw new Error(`Unable to count public book listings: ${error.message}`)
  if (count === null) throw new Error('Supabase did not return an exact public book count.')
  return count
}
