import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdapter } from '../lib/dataAdapter'
import { haversineDistance } from '../lib/geo'
import type { Book, BookWithDistance, CreateBookInput, UpdateBookInput } from '../types/book'

export function useBooks(limit?: number) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const loadBooks = useCallback(() => getAdapter().getBooks(limit), [limit])

  useEffect(() => {
    const currentRequest = ++requestId.current
    void loadBooks()
      .then((data) => {
        if (currentRequest !== requestId.current) return
        setBooks(data)
        setError(null)
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
  }, [loadBooks])

  const refetch = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)
    try {
      const data = await loadBooks()
      if (currentRequest === requestId.current) {
        setBooks(data)
        setError(null)
      }
    } catch (e) {
      if (currentRequest === requestId.current) {
        console.error('Unable to refresh book listings', e)
        setError('Chưa thể tải danh sách sách. Vui lòng thử lại.')
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [loadBooks])
  return { books, loading, error, refetch }
}

export function useMyBooks(userId: string | undefined) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedOwnerId, setLoadedOwnerId] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  const fetchMyBooks = useCallback(
    () => (userId ? getAdapter().getMyBooks(userId) : Promise.resolve([])),
    [userId],
  )

  useEffect(() => {
    let cancelled = false
    void fetchMyBooks()
      .then((data) => {
        if (cancelled) return
        setBooks(data)
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
  }, [fetchMyBooks, userId])

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMyBooks()
      setBooks(data)
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
  }, [fetchMyBooks, userId])

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
  const { books, loading, error, refetch } = useBooks()

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

  return { books: nearby, loading, error, refetch }
}
