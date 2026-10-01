import type {
  Book,
  BookGuardQueueItem,
  BookModerationReport,
  BookReportReason,
  CreateBookInput,
  CreateExchangeInput,
  ExchangeRequest,
  UpdateBookInput,
} from '../types/book'
import type { LoginInput, UpdateProfileInput, UserProfile } from '../types/user'

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

  async register(): Promise<UserProfile> {
    throw new Error('Đăng ký mới cần Supabase Auth để xác nhận email thật. Hãy cấu hình Supabase rồi thử lại.')
  },

  async resendSignupConfirmation(): Promise<void> {
    throw new Error('Xác nhận email cần được cấu hình qua Supabase; chế độ lưu trên thiết bị không gửi email.')
  },

  async sendPasswordReset(): Promise<void> {
    throw new Error('Đặt lại mật khẩu qua email cần được cấu hình Supabase Auth.')
  },

  async completePasswordReset(): Promise<void> {
    throw new Error('Liên kết đặt lại mật khẩu qua email cần được cấu hình Supabase Auth.')
  },

  async verifySignupOtp(): Promise<UserProfile> {
    throw new Error('Chế độ lưu trên thiết bị không gửi mã OTP qua email.')
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

  async getBooks(limit?: number, offset = 0): Promise<Book[]> {
    const books = readBooks().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return typeof limit === 'number' ? books.slice(offset, offset + limit) : books
  },

  async getBookById(id: string): Promise<Book | null> {
    return readBooks().find((b) => b.id === id) ?? null
  },

  async getRelatedBooks(category: string, excludeId: string, limit = 4): Promise<Book[]> {
    return readBooks()
      .filter((book) => book.category === category && book.id !== excludeId && book.status === 'available')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  },

  async getBookImages(id: string): Promise<string[]> {
    return readBooks().find((book) => book.id === id)?.imageUrls ?? []
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

  async getMyBooks(ownerId: string, limit?: number, offset = 0): Promise<Book[]> {
    const books = readBooks()
      .filter((b) => b.ownerId === ownerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return limit === undefined ? books : books.slice(offset, offset + limit)
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
    input: CreateExchangeInput,
  ): Promise<ExchangeRequest> {
    const book = readBooks().find((entry) => entry.id === input.bookId)
    if (!book || book.status !== 'available') throw new Error('Sách này hiện không còn khả dụng.')
    if (book.ownerId === requesterId) throw new Error('Bạn không thể gửi đề nghị cho sách của mình.')
    const request: ExchangeRequest = {
      id: generateId(),
      bookId: input.bookId,
      requesterId,
      ownerId: book.ownerId,
      message: input.message,
      status: 'pending',
      createdAt: now(),
      bookTitle: book.title,
      exchangeType: book.exchangeType,
      bookStatus: book.status,
      requesterName: readUsers().find((user) => user.id === requesterId)?.fullName ?? 'Thành viên',
      ownerName: book.ownerName,
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

  async updateExchangeRequest(
    requestId: string,
    action: 'accept' | 'reject' | 'cancel' | 'confirm-completion',
  ): Promise<string> {
    const exchanges = readExchanges()
    const index = exchanges.findIndex((request) => request.id === requestId)
    if (index < 0) throw new Error('Không tìm thấy đề nghị.')
    const current = exchanges[index]
    const actorId = getSessionUserId()
    if (action === 'accept' || action === 'reject') {
      if (actorId !== current.ownerId || current.status !== 'pending') throw new Error('Không thể cập nhật đề nghị này.')
      current.status = action === 'accept' ? 'accepted' : 'rejected'
    } else if (action === 'cancel') {
      if (actorId !== current.requesterId || current.status !== 'pending') throw new Error('Không thể hủy đề nghị này.')
      current.status = 'cancelled'
    } else {
      throw new Error('Xác nhận hoàn tất cần kết nối Supabase.')
    }
    writeExchanges(exchanges)
    return current.status
  },

  async getConversation(): Promise<null> {
    return null
  },

  async getChatMessages(): Promise<[]> {
    return []
  },

  async sendChatMessage(): Promise<never> {
    throw new Error('Tin nhắn giữa các thành viên cần kết nối Supabase.')
  },

  subscribeToChatMessages(): () => void {
    return () => {}
  },

  async getReviewedInteractionIds(): Promise<string[]> {
    return []
  },

  async getMemberReviews(): Promise<[]> {
    return []
  },

  async getMemberTrust(): Promise<{ completedInteractions: number; reviewCount: number }> {
    return { completedInteractions: 0, reviewCount: 0 }
  },

  async createExchangeReview(): Promise<void> {
    throw new Error('Đánh giá sau tương tác cần kết nối Supabase.')
  },

  async getMyAppRole(userId: string): Promise<'user'> {
    void userId
    return 'user'
  },

  async getModerationReports(): Promise<BookModerationReport[]> {
    return []
  },

  async getBookGuardQueue(): Promise<BookGuardQueueItem[]> {
    return []
  },

  async getStaffUsers(): Promise<[]> {
    return []
  },

  async setStaffUserRole(): Promise<void> {
    throw new Error('Quản lý vai trò cần kết nối Supabase.')
  },

  async getStaffSummary() {
    return {
      userCount: readUsers().length,
      bookCount: readBooks().length,
      pendingReportCount: 0,
      activeRequestCount: readExchanges().filter((entry) => entry.status === 'pending' || entry.status === 'accepted').length,
      completedInteractionCount: 0,
    }
  },

  async getAuditLog(): Promise<[]> {
    return []
  },

  async reviewBookGuard(): Promise<void> {
    throw new Error('Công cụ kiểm duyệt chỉ khả dụng khi đã kết nối Supabase.')
  },

  async updateModerationReport(): Promise<void> {
    throw new Error('Công cụ kiểm duyệt chỉ khả dụng khi đã kết nối Supabase.')
  },

  async moderateDeleteBook(): Promise<void> {
    throw new Error('Công cụ kiểm duyệt chỉ khả dụng khi đã kết nối Supabase.')
  },
}
