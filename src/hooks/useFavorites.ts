import { useCallback, useEffect, useState } from 'react'
import { getAdapter } from '../lib/dataAdapter'
import { userFacingError } from '../lib/userFacingError'

const EMPTY_FAVORITES = new Set<string>()

export function useFavorites(userId: string | undefined) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set())
  const [loadedUserId, setLoadedUserId] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!userId) {
      return
    }

    void getAdapter()
      .getFavoriteBookIds(userId)
      .then((ids) => {
        if (cancelled) return
        setFavoriteIds(new Set(ids))
        setError(null)
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setFavoriteIds(new Set())
          console.error('Unable to load saved-book preferences', cause)
          setError(userFacingError(cause, 'Chưa thể tải sách yêu thích. Vui lòng thử lại.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoadedUserId(userId)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const toggleFavorite = useCallback(async (bookId: string) => {
    if (!userId) throw new Error('Đăng nhập để lưu sách yêu thích')
    if (loadedUserId !== userId) throw new Error('Đang tải sách yêu thích, vui lòng thử lại.')
    const nextValue = !favoriteIds.has(bookId)
    await getAdapter().setBookFavorite(userId, bookId, nextValue)
    setFavoriteIds((current) => {
      const next = new Set(current)
      if (nextValue) next.add(bookId)
      else next.delete(bookId)
      return next
    })
  }, [favoriteIds, loadedUserId, userId])

  const visibleFavoriteIds = userId && loadedUserId === userId ? favoriteIds : EMPTY_FAVORITES
  return {
    favoriteIds: visibleFavoriteIds,
    loading: Boolean(userId) && loadedUserId !== userId,
    error: userId ? error : null,
    toggleFavorite,
  }
}
