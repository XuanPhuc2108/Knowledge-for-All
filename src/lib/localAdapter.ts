import type {
  Book,
  BookReportReason,
  CreateBookInput,
  CreateExchangeInput,
  ExchangeRequest,
  UpdateBookInput,
} from '../types/book'
import type { LoginInput, RegisterInput, UpdateProfileInput, UserProfile } from '../types/user'

const USERS_KEY = 'sgn_users'
const BOOKS_KEY = 'sgn_books'
const EXCHANGES_KEY = 'sgn_exchanges'
const SESSION_KEY = 'sgn_session'
const FAVORITES_KEY = 'sgn_book_favorites'
const REPORTS_KEY = 'sgn_book_reports'

interface StoredUser extends UserProfile {
  passwordHash: string
}

function generateId(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return `h${Math.abs(hash)}`
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as StoredUser[]) : []
  } catch {
    return []
  }
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function readBooks(): Book[] {
  try {
    const raw = localStorage.getItem(BOOKS_KEY)
    return raw ? (JSON.parse(raw) as Book[]) : []
  } catch {
    return []
  }
}

function writeBooks(books: Book[]): void {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books))
}

function readExchanges(): ExchangeRequest[] {
  try {
    const raw = localStorage.getItem(EXCHANGES_KEY)
    return raw ? (JSON.parse(raw) as ExchangeRequest[]) : []
  } catch {
    return []
  }
}

function writeExchanges(exchanges: ExchangeRequest[]): void {
  localStorage.setItem(EXCHANGES_KEY, JSON.stringify(exchanges))
}

function readFavorites(): { userId: string; bookId: string }[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? (JSON.parse(raw) as { userId: string; bookId: string }[]) : []
  } catch {
    return []
  }
}

function toProfile(user: StoredUser): UserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    contactPhone: user.contactPhone,
    contactEmail: user.contactEmail,
    areaLabel: user.areaLabel,
    showContactPhone: user.showContactPhone ?? false,
    showContactEmail: user.showContactEmail ?? false,
    showArea: user.showArea ?? false,
    latitude: user.latitude,
    longitude: user.longitude,
    locationAccuracy: user.locationAccuracy,
    locationEnabled: user.locationEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function setSession(userId: string): void {
  localStorage.setItem(SESSION_KEY, userId)
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export const localAdapter = {
  async getCurrentUser(): Promise<UserProfile | null> {
    const userId = getSessionUserId()
    if (!userId) return null
    const user = readUsers().find((u) => u.id === userId)
    return user ? toProfile(user) : null
  },

  async register(input: RegisterInput): Promise<UserProfile> {
    const users = readUsers()
    if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error('Email đã được sử dụng')
    }
    const timestamp = now()
    const newUser: StoredUser = {
      id: generateId(),
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      showContactPhone: false,
      showContactEmail: false,
      showArea: false,
      locationEnabled: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      passwordHash: simpleHash(input.password),
    }
    users.push(newUser)
    writeUsers(users)
    setSession(newUser.id)
    return toProfile(newUser)
  },

  async login(input: LoginInput): Promise<UserProfile> {
    const user = readUsers().find(
      (u) =>
        u.email.toLowerCase() === input.email.toLowerCase() &&
        u.passwordHash === simpleHash(input.password),
    )
    if (!user) throw new Error('Email hoặc mật khẩu không đúng')
    setSession(user.id)
    return toProfile(user)
  },

  async logout(): Promise<void> {
    clearSession()
  },

  async deleteAccount(userId: string): Promise<void> {
    const users = readUsers()
    if (!users.some((user) => user.id === userId)) throw new Error('Không tìm thấy tài khoản')
    writeUsers(users.filter((user) => user.id !== userId))
    writeBooks(readBooks().filter((book) => book.ownerId !== userId))
    writeExchanges(readExchanges().filter(
      (exchange) => exchange.requesterId !== userId && exchange.ownerId !== userId,
    ))
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(readFavorites().filter((favorite) => favorite.userId !== userId)),
    )
    try {
      const reports = JSON.parse(localStorage.getItem(REPORTS_KEY) ?? '[]') as { userId: string }[]
      localStorage.setItem(REPORTS_KEY, JSON.stringify(reports.filter((report) => report.userId !== userId)))
    } catch {
      localStorage.removeItem(REPORTS_KEY)
    }
    clearSession()
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const users = readUsers()
    const index = users.findIndex((user) => user.id === userId)
    if (index < 0) throw new Error('Không tìm thấy tài khoản')
    if (users[index].passwordHash !== simpleHash(currentPassword)) {
      throw new Error('Mật khẩu hiện tại không đúng')
    }
    users[index] = { ...users[index], passwordHash: simpleHash(newPassword), updatedAt: now() }
    writeUsers(users)
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const users = readUsers()
    const index = users.findIndex((u) => u.id === userId)
    if (index === -1) throw new Error('Không tìm thấy người dùng')

    const updated: StoredUser = {
      ...users[index],
      ...input,
      updatedAt: now(),
    }

    if (input.locationEnabled === false) {
      delete updated.latitude
      delete updated.longitude
      delete updated.locationAccuracy
    }

    users[index] = updated
    writeUsers(users)
    return toProfile(updated)
  },

  async getBooks(limit?: number): Promise<Book[]> {
    const books = readBooks().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return typeof limit === 'number' ? books.slice(0, limit) : books
  },

  async getBookById(id: string): Promise<Book | null> {
    return readBooks().find((b) => b.id === id) ?? null
  },

  async createBook(ownerId: string, ownerName: string, input: CreateBookInput): Promise<Book> {
    const timestamp = now()
    const book: Book = {
      id: generateId(),
      ownerId,
      ownerName,
      ...input,
      status: 'available',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const books = readBooks()
    books.push(book)
    writeBooks(books)
    return book
  },

  async updateBook(id: string, ownerId: string, input: UpdateBookInput): Promise<Book> {
    const books = readBooks()
    const index = books.findIndex((b) => b.id === id)
    if (index === -1) throw new Error('Không tìm thấy sách')
    if (books[index].ownerId !== ownerId) throw new Error('Không có quyền chỉnh sửa')

    books[index] = { ...books[index], ...input, updatedAt: now() }
    writeBooks(books)
    return books[index]
  },

  async deleteBook(id: string, ownerId: string): Promise<void> {
    const books = readBooks()
    const book = books.find((b) => b.id === id)
    if (!book) throw new Error('Không tìm thấy sách')
    if (book.ownerId !== ownerId) throw new Error('Không có quyền xóa')
    writeBooks(books.filter((b) => b.id !== id))
  },

  async getMyBooks(ownerId: string): Promise<Book[]> {
    return readBooks()
      .filter((b) => b.ownerId === ownerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  async getFavoriteBookIds(userId: string): Promise<string[]> {
    return readFavorites().filter((favorite) => favorite.userId === userId).map((favorite) => favorite.bookId)
  },

  async setBookFavorite(userId: string, bookId: string, favorite: boolean): Promise<void> {
    const entries = readFavorites().filter((entry) => !(entry.userId === userId && entry.bookId === bookId))
    if (favorite) entries.push({ userId, bookId })
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(entries))
  },

  async reportBook(
    userId: string,
    bookId: string,
    reason: BookReportReason,
    details?: string,
  ): Promise<void> {
    const reports = JSON.parse(localStorage.getItem(REPORTS_KEY) ?? '[]') as {
      userId: string
      bookId: string
      reason: BookReportReason
      details?: string
      createdAt: string
    }[]
    if (reports.some((report) => report.userId === userId && report.bookId === bookId)) {
      throw new Error('Bạn đã báo cáo sách này')
    }
    reports.push({ userId, bookId, reason, details, createdAt: now() })
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports))
  },

  async createExchangeRequest(
    requesterId: string,
    ownerId: string,
    input: CreateExchangeInput,
  ): Promise<ExchangeRequest> {
    const request: ExchangeRequest = {
      id: generateId(),
      bookId: input.bookId,
      requesterId,
      ownerId,
      message: input.message,
      status: 'pending',
      createdAt: now(),
    }
    const exchanges = readExchanges()
    exchanges.push(request)
    writeExchanges(exchanges)
    return request
  },

  async getExchangeRequests(userId: string): Promise<ExchangeRequest[]> {
    return readExchanges()
      .filter((e) => e.requesterId === userId || e.ownerId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },
}
