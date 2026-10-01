import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdapter } from '../lib/dataAdapter'
import { haversineDistance } from '../lib/geo'
import type { Book, BookWithDistance, CreateBookInput, UpdateBookInput } from '../types/book'

export function useBooks(limit?: number) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [nextOffset, setNextOffset] = useState(0)
  const requestId = useRef(0)
  const pageRequestId = useRef(0)
  const pageRequestInProgress = useRef(false)

  const loadBooks = useCallback(() => getAdapter().getBooks(limit, 0), [limit])

  useEffect(() => {
    const currentRequest = ++requestId.current
    void loadBooks()
      .then((data) => {
        if (currentRequest !== requestId.current) return
        setBooks(data)
        setNextOffset(data.length)
        setHasMore(limit !== undefined && data.length === limit)
        setError(null)
        setLoadMoreError(null)
      })
      .catch((e: unknown) => {
        if (currentRequest !== requestId.current) return
        console.error('Unable to load book listings', e)
        setError('Chưa thể tải danh sách sách. Vui lòng thử lại.')
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false)
      })
    return () => {
      if (currentRequest === requestId.current) requestId.current += 1
    }
  }, [limit, loadBooks])

  const refetch = useCallback(async () => {
    const currentRequest = ++requestId.current
    pageRequestId.current += 1
    pageRequestInProgress.current = false
    setLoadingMore(false)
    setLoading(true)
    try {
      const data = await loadBooks()
      if (currentRequest === requestId.current) {
        setBooks(data)
        setNextOffset(data.length)
        setHasMore(limit !== undefined && data.length === limit)
        setError(null)
        setLoadMoreError(null)
      }
    } catch (e) {
      if (currentRequest === requestId.current) {
        console.error('Unable to refresh book listings', e)
        setError('Chưa thể tải danh sách sách. Vui lòng thử lại.')
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [limit, loadBooks])

  const loadMore = useCallback(async () => {
    if (limit === undefined || !hasMore || pageRequestInProgress.current) return
    pageRequestInProgress.current = true
    const currentPageRequest = ++pageRequestId.current
    const currentListRequest = requestId.current
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const data = await getAdapter().getBooks(limit, nextOffset)
      if (currentListRequest !== requestId.current || currentPageRequest !== pageRequestId.current) return
      setBooks((current) => {
        const existingIds = new Set(current.map((book) => book.id))
        return [...current, ...data.filter((book) => !existingIds.has(book.id))]
      })
      setNextOffset((current) => current + data.length)
      setHasMore(data.length === limit)
    } catch (cause) {
      if (currentListRequest !== requestId.current || currentPageRequest !== pageRequestId.current) return
      console.error('Unable to load another page of book listings', cause)
      setLoadMoreError('Chưa thể tải thêm sách. Hãy thử lại.')
    } finally {
      if (currentPageRequest === pageRequestId.current) {
        pageRequestInProgress.current = false
        setLoadingMore(false)
      }
    }
  }, [hasMore, limit, nextOffset])

  return { books, loading, loadingMore, hasMore, error, loadMoreError, loadMore, refetch }
}

export function useMyBooks(userId: string | undefined) {
  const pageSize = 24
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [loadedOwnerId, setLoadedOwnerId] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const pageRequestInProgress = useRef(false)

  const fetchMyBooks = useCallback(
    () => (userId ? getAdapter().getMyBooks(userId, pageSize, 0) : Promise.resolve([])),
    [userId],
  )

  useEffect(() => {
    let cancelled = false
    void fetchMyBooks()
      .then((data) => {
        if (cancelled) return
        setBooks(data)
        setHasMore(data.length === pageSize)
        setLoadMoreError(null)
        setLoadedOwnerId(userId)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setBooks([])
          setLoadedOwnerId(userId)
          console.error('Unable to load user book listings', e)
          setError('Chưa thể tải sách của bạn. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchMyBooks, pageSize, userId])

  const refetch = useCallback(async () => {
    pageRequestInProgress.current = false
    setLoading(true)
    try {
      const data = await fetchMyBooks()
      setBooks(data)
      setHasMore(data.length === pageSize)
      setLoadMoreError(null)
      setLoadedOwnerId(userId)
      setError(null)
    } catch (e) {
      setBooks([])
      setLoadedOwnerId(userId)
      console.error('Unable to refresh user book listings', e)
      setError('Chưa thể tải sách của bạn. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [fetchMyBooks, pageSize, userId])

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || pageRequestInProgress.current) return
    pageRequestInProgress.current = true
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const data = await getAdapter().getMyBooks(userId, pageSize, books.length)
      setBooks((current) => {
        const existingIds = new Set(current.map((book) => book.id))
        return [...current, ...data.filter((book) => !existingIds.has(book.id))]
      })
      setHasMore(data.length === pageSize)
    } catch (cause) {
      console.error('Unable to load another page of user book listings', cause)
      setLoadMoreError('Chưa thể tải thêm sách của bạn. Hãy thử lại.')
    } finally {
      pageRequestInProgress.current = false
      setLoadingMore(false)
    }
  }, [books.length, hasMore, pageSize, userId])

  const createBook = async (ownerName: string, input: CreateBookInput) => {
    if (!userId) throw new Error('Chưa đăng nhập')
    const book = await getAdapter().createBook(userId, ownerName, input)
    setBooks((prev) => [book, ...prev])
    return book
  }

  const updateBook = async (id: string, input: UpdateBookInput) => {
    if (!userId) throw new Error('Chưa đăng nhập')
    const book = await getAdapter().updateBook(id, userId, input)
    setBooks((prev) => prev.map((b) => (b.id === id ? book : b)))
    return book
  }

  const deleteBook = async (id: string) => {
    if (!userId) throw new Error('Chưa đăng nhập')
    await getAdapter().deleteBook(id, userId)
    setBooks((prev) => prev.filter((b) => b.id !== id))
  }

  const ownsLoadedBooks = loadedOwnerId === userId
  return {
    books: userId && ownsLoadedBooks ? books : [],
    loading: Boolean(userId) && (loading || !ownsLoadedBooks),
    error: ownsLoadedBooks ? error : null,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
    refetch,
    createBook,
    updateBook,
    deleteBook,
  }
}

export function useNearbyBooks(
  userLat?: number,
  userLng?: number,
  radiusMeters = Infinity,
  excludeOwnerId?: string,
) {
  const { books, loading, error, refetch, hasMore, loadingMore, loadMoreError, loadMore } = useBooks(24)

  const nearby: BookWithDistance[] = books
    .filter((b) => {
      if (excludeOwnerId && b.ownerId === excludeOwnerId) return false
      if (b.latitude === undefined || b.longitude === undefined) return false
      if (userLat === undefined || userLng === undefined) return true
      const dist = haversineDistance(userLat, userLng, b.latitude, b.longitude)
      return dist <= radiusMeters
    })
    .map((b): BookWithDistance => {
      if (
        userLat === undefined ||
        userLng === undefined ||
        b.latitude === undefined ||
        b.longitude === undefined
      ) {
        return { ...b }
      }
      return {
        ...b,
        distanceMeters: haversineDistance(userLat, userLng, b.latitude, b.longitude),
      }
    })
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))

  return { books: nearby, loading, error, refetch, hasMore, loadingMore, loadMoreError, loadMore }
}
