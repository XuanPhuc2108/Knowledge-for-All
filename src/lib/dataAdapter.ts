import type {
  Book,
  BookConversation,
  ChatMessage,
  CommunityReview,
  AppAuditEntry,
  BookModerationReport,
  BookReportReason,
  BookReportStatus,
  CreateBookInput,
  CreateExchangeInput,
  ExchangeRequest,
  MemberTrust,
  StaffAppUser,
  StaffPlatformSummary,
  UpdateBookInput,
} from '../types/book'
import type { LoginInput, RegisterInput, UpdateProfileInput, UserProfile } from '../types/user'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthRedirectUrl, getSupabaseClient, isSupabaseConfigured } from './supabase'
import { localAdapter } from './localAdapter'
import { isValidMessengerUrl, isValidZaloUrl } from './validation'
import type { RealtimeChannel } from '@supabase/supabase-js'

const PUBLIC_BOOK_COLUMNS = 'id, owner_id, owner_name, title, author, category, condition, exchange_type, description, image_urls, latitude, longitude, contact_phone, contact_email, contact_zalo_url, contact_messenger_url, status, created_at, updated_at'
const OWN_BOOK_COLUMNS = 'id, owner_id, owner_name, title, author, category, condition, exchange_type, description, image_urls, contact_phone, contact_email, contact_zalo_url, contact_messenger_url, status, created_at, updated_at'

export interface DataAdapter {
  getCurrentUser(): Promise<UserProfile | null>
  register(input: RegisterInput): Promise<UserProfile | null>
  resendSignupConfirmation(email: string): Promise<void>
  login(input: LoginInput): Promise<UserProfile>
  logout(): Promise<void>
  updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile>
  deleteAccount(userId: string): Promise<void>
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>
  getBooks(limit?: number, offset?: number): Promise<Book[]>
  getBookById(id: string): Promise<Book | null>
  getRelatedBooks(category: string, excludeId: string, limit?: number): Promise<Book[]>
  getBookImages(id: string): Promise<string[]>
  createBook(ownerId: string, ownerName: string, input: CreateBookInput): Promise<Book>
  updateBook(id: string, ownerId: string, input: UpdateBookInput): Promise<Book>
  deleteBook(id: string, ownerId: string): Promise<void>
  getMyBooks(ownerId: string): Promise<Book[]>
  getFavoriteBookIds(userId: string): Promise<string[]>
  setBookFavorite(userId: string, bookId: string, favorite: boolean): Promise<void>
  reportBook(userId: string, bookId: string, reason: BookReportReason, details?: string): Promise<void>
  createExchangeRequest(requesterId: string, input: CreateExchangeInput): Promise<ExchangeRequest>
  getExchangeRequests(userId: string): Promise<ExchangeRequest[]>
  updateExchangeRequest(requestId: string, action: 'accept' | 'reject' | 'cancel' | 'confirm-completion'): Promise<string>
  getConversation(chatId: string, userId: string): Promise<BookConversation | null>
  getChatMessages(chatId: string): Promise<ChatMessage[]>
  sendChatMessage(chatId: string, senderId: string, body: string): Promise<ChatMessage>
  subscribeToChatMessages(chatId: string, onMessage: (message: ChatMessage) => void): () => void
  getExchangeReview(interactionId: string, reviewerId: string): Promise<CommunityReview | null>
  getMemberReviews(memberId: string, limit?: number): Promise<CommunityReview[]>
  getMemberTrust(memberId: string): Promise<MemberTrust>
  createExchangeReview(input: {
    interactionId: string
    rating: number
    communicationRating: number
    reliabilityRating: number
    descriptionRating: number
    comment: string
  }): Promise<void>
  getMyAppRole(userId: string): Promise<AppRole>
  getStaffUsers(): Promise<StaffAppUser[]>
  setStaffUserRole(userId: string, role: Exclude<AppRole, 'owner'>): Promise<void>
  getStaffSummary(): Promise<StaffPlatformSummary>
  getAuditLog(): Promise<AppAuditEntry[]>
  getModerationReports(): Promise<BookModerationReport[]>
  updateModerationReport(reportId: string, status: BookReportStatus): Promise<void>
  moderateDeleteBook(bookId: string): Promise<void>
}

export type AppRole = 'user' | 'moderator' | 'admin' | 'owner'

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    avatarUrl: row.avatar_url as string | undefined,
    bio: optionalText(row.bio),
    contactPhone: optionalText(row.contact_phone),
    contactEmail: optionalText(row.contact_email),
    areaLabel: optionalText(row.area_label),
    showContactPhone: Boolean(row.show_contact_phone),
    showContactEmail: Boolean(row.show_contact_email),
    showArea: Boolean(row.show_area),
    latitude: row.latitude as number | undefined,
    longitude: row.longitude as number | undefined,
    locationAccuracy: row.location_accuracy as number | undefined,
    locationEnabled: Boolean(row.location_enabled),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function safeContactUrl(value: unknown, validate: (url: string) => boolean): string | undefined {
  const text = optionalText(value)
  return text && validate(text) ? text : undefined
}

function mapBook(row: Record<string, unknown>): Book {
  const publicProfile = row.public_profiles as {
    full_name?: string
    avatar_url?: string | null
    area_label?: string | null
    contact_phone?: string | null
    contact_email?: string | null
  } | null
  const rawStatus = row.status as string
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    ownerName: optionalText(publicProfile?.full_name) ?? optionalText(row.owner_name) ?? 'Người dùng',
    ownerAvatarUrl: optionalText(publicProfile?.avatar_url),
    ownerAreaLabel: optionalText(publicProfile?.area_label),
    title: row.title as string,
    author: row.author as string | undefined,
    category: row.category as string,
    condition: row.condition as Book['condition'],
    exchangeType: row.exchange_type as Book['exchangeType'],
    description: row.description as string,
    imageUrls: (row.image_urls as string[]) ?? [],
    latitude: row.latitude as number | undefined,
    longitude: row.longitude as number | undefined,
    contactPhone: optionalText(row.contact_phone) ?? optionalText(publicProfile?.contact_phone),
    contactEmail: optionalText(row.contact_email) ?? optionalText(publicProfile?.contact_email),
    contactZaloUrl: safeContactUrl(row.contact_zalo_url, isValidZaloUrl),
    contactMessengerUrl: safeContactUrl(row.contact_messenger_url, isValidMessengerUrl),
    status: rawStatus === 'reserved' ? 'loaned' : rawStatus === 'shared' ? 'exchanged' : rawStatus as Book['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

async function mapBooksWithPublicProfiles(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<Book[]> {
  const ownerIds = [...new Set(rows
    .map((row) => row.owner_id)
    .filter((ownerId): ownerId is string => typeof ownerId === 'string'))]
  const profilesById = new Map<string, Record<string, unknown>>()

  if (ownerIds.length > 0) {
    const { data, error } = await supabase
      .from('public_profiles')
      .select('id, full_name, avatar_url, area_label, contact_phone, contact_email')
      .in('id', ownerIds)
    if (error) throw new Error(`Không thể tải thông tin người đăng: ${error.message}`)
    for (const profile of data ?? []) {
      profilesById.set(profile.id, profile)
    }
  }

  return rows.map((row) => {
    const book = mapBook(row)
    const profile = profilesById.get(row.owner_id as string)
    if (!profile) return book
    return {
      ...book,
      ownerName: optionalText(profile.full_name) ?? book.ownerName,
      ownerAvatarUrl: optionalText(profile.avatar_url),
      ownerAreaLabel: optionalText(profile.area_label),
      contactPhone: book.contactPhone ?? optionalText(profile.contact_phone),
      contactEmail: book.contactEmail ?? optionalText(profile.contact_email),
    }
  })
}

function favoriteTableError(error: { code?: string; message: string }): Error {
  if (
    error.code === 'PGRST205' ||
    (error.message.includes('book_favorites') && error.message.includes('schema cache'))
  ) {
    return new Error(
      'Bảng yêu thích chưa có trong Supabase hoặc schema cache chưa cập nhật. ' +
      'Chạy supabase-migration-book-favorites.sql trong Supabase SQL Editor rồi tải lại trang.',
    )
  }
  return new Error(error.message)
}

const supabaseAdapter: DataAdapter = {
  async getCurrentUser() {
    const supabase = getSupabaseClient()
    if (!supabase) return null
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw new Error(authError.message)
    if (!user) return null
    if (user.app_metadata.provider === 'email' && !user.email_confirmed_at) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) throw new Error(signOutError.message)
      throw new Error('Xác nhận email trước khi sử dụng tài khoản. Hãy mở liên kết trong email xác nhận.')
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (data) return mapProfile(data)
    if (error) throw new Error(error.message)

    const timestamp = new Date().toISOString()
    const fullName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
      (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
      user.email?.split('@')[0] ||
      'Người dùng'
    const profile = {
      id: user.id,
      full_name: fullName,
      email: user.email ?? '',
      location_enabled: false,
      created_at: timestamp,
      updated_at: timestamp,
    }
    const { data: created, error: upsertError } = await supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .single()
    if (upsertError) throw new Error(upsertError.message)
    if (!created) throw new Error('Không thể tạo hồ sơ người dùng')
    return mapProfile(created)
  },

  async register(input) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: { full_name: input.fullName },
        emailRedirectTo: getAuthRedirectUrl(),
      },
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Đăng ký thất bại')
    if (!data.session) return null
    if (!data.user.email_confirmed_at) {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) throw new Error(signOutError.message)
      return null
    }
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
    if (signOutError) throw new Error(signOutError.message)
    throw new Error(
      'Supabase đang cho phép đăng nhập trước khi xác nhận email. ' +
      'Hãy bật Email confirmations trong Authentication → Providers → Email rồi thử lại.',
    )
  },

  async resendSignupConfirmation(email) {
    const supabase = getSupabaseClient()!
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: getAuthRedirectUrl() },
    })
    if (error) throw new Error(error.message)
  },

  async login(input) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    })
    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        throw new Error('Xác nhận email trước khi đăng nhập. Hãy mở liên kết trong email xác nhận.')
      }
      throw new Error(error.message)
    }
    if (
      data.user?.app_metadata.provider === 'email' &&
      !data.user.email_confirmed_at
    ) {
      await supabase.auth.signOut({ scope: 'local' })
      throw new Error('Xác nhận email trước khi đăng nhập. Hãy mở liên kết trong email xác nhận.')
    }
    const user = await supabaseAdapter.getCurrentUser()
    if (!user) throw new Error('Không tìm thấy hồ sơ người dùng')
    return user
  },

  async logout() {
    const supabase = getSupabaseClient()!
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  },

  async updateProfile(userId, input) {
    const supabase = getSupabaseClient()!
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.fullName !== undefined) payload.full_name = input.fullName
    if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl
    if (input.bio !== undefined) payload.bio = input.bio || null
    if (input.contactPhone !== undefined) payload.contact_phone = input.contactPhone || null
    if (input.contactEmail !== undefined) payload.contact_email = input.contactEmail || null
    if (input.areaLabel !== undefined) payload.area_label = input.areaLabel || null
    if (input.showContactPhone !== undefined) payload.show_contact_phone = input.showContactPhone
    if (input.showContactEmail !== undefined) payload.show_contact_email = input.showContactEmail
    if (input.showArea !== undefined) payload.show_area = input.showArea
    if (input.latitude !== undefined) payload.latitude = input.latitude
    if (input.longitude !== undefined) payload.longitude = input.longitude
    if (input.locationAccuracy !== undefined) payload.location_accuracy = input.locationAccuracy
    if (input.locationEnabled !== undefined) {
      payload.location_enabled = input.locationEnabled
      if (!input.locationEnabled) {
        payload.latitude = null
        payload.longitude = null
        payload.location_accuracy = null
      }
    }
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select().single()
    if (error) throw new Error(error.message)
    return mapProfile(data)
  },

  async deleteAccount() {
    const supabase = getSupabaseClient()!
    const { error } = await supabase.rpc('delete_my_account')
    if (error) throw new Error(error.message)
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
    if (signOutError) throw new Error(signOutError.message)
  },

  async changePassword(_userId, currentPassword, newPassword) {
    const supabase = getSupabaseClient()!
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw new Error(userError.message)
    if (!user?.email) throw new Error('Tài khoản không có email để xác thực')
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (reauthError) throw new Error('Mật khẩu hiện tại không đúng')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
  },

  async getBooks(limit, offset = 0) {
    const supabase = getSupabaseClient()!
    let query = supabase
      .from('public_books')
      .select(PUBLIC_BOOK_COLUMNS)
      .order('created_at', { ascending: false })
    if (limit) query = query.range(offset, offset + limit - 1)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return mapBooksWithPublicProfiles(supabase, data ?? [])
  },

  async getBookById(id) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('public_books')
      .select(PUBLIC_BOOK_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    const [book] = await mapBooksWithPublicProfiles(supabase, [data])
    return book
  },

  async getRelatedBooks(category, excludeId, limit = 4) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('public_books')
      .select(PUBLIC_BOOK_COLUMNS)
      .eq('category', category)
      .neq('id', excludeId)
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return mapBooksWithPublicProfiles(supabase, data ?? [])
  },

  async getBookImages(id) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('books')
      .select('image_urls')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return (data?.image_urls as string[] | null) ?? []
  },

  async createBook(ownerId, ownerName, input) {
    const supabase = getSupabaseClient()!
    const timestamp = new Date().toISOString()
    const payload = {
      owner_id: ownerId,
      owner_name: ownerName,
      title: input.title,
      author: input.author,
      category: input.category,
      condition: input.condition,
      exchange_type: input.exchangeType,
      description: input.description,
      image_urls: input.imageUrls,
      latitude: input.latitude,
      longitude: input.longitude,
      contact_phone: input.contactPhone,
      contact_email: input.contactEmail,
      contact_zalo_url: input.contactZaloUrl,
      contact_messenger_url: input.contactMessengerUrl,
      status: 'available',
      created_at: timestamp,
      updated_at: timestamp,
    }
    const { data, error } = await supabase.from('books').insert(payload).select(OWN_BOOK_COLUMNS).single()
    if (error) throw new Error(error.message)
    return { ...mapBook(data), ownerName }
  },

  async updateBook(id, ownerId, input) {
    const supabase = getSupabaseClient()!
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.title !== undefined) payload.title = input.title
    if (input.author !== undefined) payload.author = input.author
    if (input.category !== undefined) payload.category = input.category
    if (input.condition !== undefined) payload.condition = input.condition
    if (input.exchangeType !== undefined) payload.exchange_type = input.exchangeType
    if (input.description !== undefined) payload.description = input.description
    if (input.imageUrls !== undefined) payload.image_urls = input.imageUrls
    if (input.latitude !== undefined) payload.latitude = input.latitude
    if (input.longitude !== undefined) payload.longitude = input.longitude
    if (input.contactPhone !== undefined) payload.contact_phone = input.contactPhone
    if (input.contactEmail !== undefined) payload.contact_email = input.contactEmail
    if (input.contactZaloUrl !== undefined) payload.contact_zalo_url = input.contactZaloUrl
    if (input.contactMessengerUrl !== undefined) payload.contact_messenger_url = input.contactMessengerUrl
    if (input.status !== undefined) payload.status = input.status

    const { data, error } = await supabase
      .from('books')
      .update(payload)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select(OWN_BOOK_COLUMNS)
      .single()
    if (error) throw new Error(error.message)
    return mapBook(data)
  },

  async deleteBook(id, ownerId) {
    const supabase = getSupabaseClient()!
    const { error } = await supabase.from('books').delete().eq('id', id).eq('owner_id', ownerId)
    if (error) throw new Error(error.message)
  },

  async getMyBooks(ownerId) {
    const supabase = getSupabaseClient()!
    const booksRequest = supabase
      .from('books')
      .select(OWN_BOOK_COLUMNS)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
    const profileRequest = supabase
      .from('public_profiles')
      .select('id, full_name, avatar_url, area_label, contact_phone, contact_email')
      .eq('id', ownerId)
    const [{ data, error }, { data: profiles, error: profileError }] = await Promise.all([
      booksRequest,
      profileRequest,
    ])
    if (error) throw new Error(error.message)
    if (profileError) throw new Error(`Không thể tải thông tin người đăng: ${profileError.message}`)
    const rows = data ?? []
    const ownProfile = profiles?.[0]
    return rows.map((row) => {
      const book = mapBook(row)
      if (!ownProfile) return book
      return {
        ...book,
        ownerName: optionalText(ownProfile.full_name) ?? book.ownerName,
        ownerAvatarUrl: optionalText(ownProfile.avatar_url),
        ownerAreaLabel: optionalText(ownProfile.area_label),
        contactPhone: book.contactPhone ?? optionalText(ownProfile.contact_phone),
        contactEmail: book.contactEmail ?? optionalText(ownProfile.contact_email),
      }
    })
  },

  async getFavoriteBookIds(userId) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('book_favorites')
      .select('book_id')
      .eq('user_id', userId)
    if (error) throw favoriteTableError(error)
    return (data ?? []).map((row) => row.book_id)
  },

  async setBookFavorite(userId, bookId, favorite) {
    const supabase = getSupabaseClient()!
    const result = favorite
      ? await supabase.from('book_favorites').upsert(
          { user_id: userId, book_id: bookId },
          { onConflict: 'user_id,book_id', ignoreDuplicates: true },
        )
      : await supabase
          .from('book_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('book_id', bookId)
    if (result.error) throw favoriteTableError(result.error)
  },

  async reportBook(userId, bookId, reason, details) {
    const supabase = getSupabaseClient()!
    const { error } = await supabase.from('book_reports').insert({
      reporter_id: userId,
      book_id: bookId,
      reason,
      details: details?.trim() || null,
    })
    if (error) throw new Error(error.message)
  },

  async getMyAppRole(userId) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase.rpc('get_my_app_role')
    if (error) throw new Error(error.message)
    const roleRow = Array.isArray(data) ? data[0] : undefined
    if (roleRow && roleRow.user_id !== userId) {
      throw new Error('Phản hồi phân quyền không khớp tài khoản hiện tại.')
    }
    const role = roleRow?.role
    return role === 'moderator' || role === 'admin' || role === 'owner' ? role : 'user'
  },

  async getStaffUsers() {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase.rpc('list_app_users_for_staff')
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      avatarUrl: optionalText(row.avatar_url),
      role: (row.role === 'moderator' || row.role === 'admin' || row.role === 'owner'
        ? row.role
        : 'user') as AppRole,
      joinedAt: row.joined_at,
    }))
  },

  async setStaffUserRole(userId, role) {
    const supabase = getSupabaseClient()!
    const { error } = await supabase.rpc('set_app_user_role', { p_user_id: userId, p_role: role })
    if (error) throw new Error(error.message)
  },

  async getStaffSummary() {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase.rpc('get_staff_platform_summary')
    if (error) throw new Error(error.message)
    const row = Array.isArray(data) ? data[0] : undefined
    if (!row) throw new Error('Không thể tải thống kê quản trị.')
    return {
      userCount: row.user_count,
      bookCount: row.book_count,
      pendingReportCount: row.pending_report_count,
      activeRequestCount: row.active_request_count,
      completedInteractionCount: row.completed_interaction_count,
    }
  },

  async getAuditLog() {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('app_audit_log')
      .select('id, actor_id, subject_user_id, book_id, event_type, details, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({
      id: row.id,
      actorId: row.actor_id ?? undefined,
      subjectUserId: row.subject_user_id ?? undefined,
      bookId: row.book_id ?? undefined,
      eventType: row.event_type,
      details: row.details ?? {},
      createdAt: row.created_at,
    }))
  },

  async getModerationReports() {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('book_reports')
      .select('id, reporter_id, book_id, reason, details, status, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const reports = data ?? []
    const bookIds = [...new Set(reports.map((report) => report.book_id))]
    if (bookIds.length === 0) return []

    const { data: rows, error: booksError } = await supabase
      .from('public_books')
      .select('id, owner_id, title, status')
      .in('id', bookIds)
    if (booksError) throw new Error(booksError.message)
    const profileIds = [...new Set([
      ...(rows ?? []).map((row) => row.owner_id),
      ...reports.map((report) => report.reporter_id),
    ])]
    const { data: profiles, error: profilesError } = profileIds.length > 0
      ? await supabase.from('public_profiles').select('id, full_name').in('id', profileIds)
      : { data: [], error: null }
    if (profilesError) throw new Error(profilesError.message)
    const namesById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
    const booksById = new Map((rows ?? []).map((row) => [row.id, row]))
    return reports.map((report) => {
      const book = booksById.get(report.book_id)
      return {
        id: report.id,
        bookId: report.book_id,
        reporterId: report.reporter_id,
        reporterName: namesById.get(report.reporter_id) ?? 'Thành viên',
        reason: report.reason as BookReportReason,
        details: optionalText(report.details),
        status: (report.status ?? 'pending') as BookReportStatus,
        createdAt: report.created_at,
        book: book ? {
          id: book.id,
          title: book.title,
          ownerId: book.owner_id,
          ownerName: namesById.get(book.owner_id) ?? 'Người dùng',
          status: book.status as Book['status'],
        } : undefined,
      } satisfies BookModerationReport
    })
  },

  async updateModerationReport(reportId, status) {
    const supabase = getSupabaseClient()!
    const { error } = await supabase
      .from('book_reports')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', reportId)
    if (error) throw new Error(error.message)
  },

  async moderateDeleteBook(bookId) {
    const supabase = getSupabaseClient()!
    const { error } = await supabase.from('books').delete().eq('id', bookId)
    if (error) throw new Error(error.message)
  },

  async createExchangeRequest(requesterId, input) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase.rpc('create_book_exchange_request', {
      p_book_id: input.bookId,
      p_message: input.message,
    })
    if (error) throw new Error(error.message)
    const row = Array.isArray(data) ? data[0] : data
    if (!row) throw new Error('Không thể tạo lời đề nghị.')
    return {
      id: row.request_id,
      chatId: row.chat_id,
      bookId: input.bookId,
      requesterId,
      ownerId: row.owner_id,
      message: input.message.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
  },

  async getExchangeRequests(userId) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('exchange_requests')
      .select('id, book_id, requester_id, owner_id, message, status, created_at, owner_completed_at, requester_completed_at, completed_at')
      .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const rows = data ?? []
    if (rows.length === 0) return []
    const bookIds = [...new Set(rows.map((row) => row.book_id))]
    const participantIds = [...new Set(rows.flatMap((row) => [row.requester_id, row.owner_id]))]
    const [booksResult, profilesResult, chatsResult] = await Promise.all([
      supabase.from('public_books').select('id, title, exchange_type, status').in('id', bookIds),
      supabase.from('public_profiles').select('id, full_name').in('id', participantIds),
      supabase.from('chats').select('id, book_id, owner_id, requester_id').in('book_id', bookIds),
    ])
    if (booksResult.error) throw new Error(booksResult.error.message)
    if (profilesResult.error) throw new Error(profilesResult.error.message)
    if (chatsResult.error) throw new Error(chatsResult.error.message)
    const booksById = new Map((booksResult.data ?? []).map((book) => [book.id, book]))
    const namesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]))
    const chatsByParticipant = new Map((chatsResult.data ?? []).map((chat) => [
      `${chat.book_id}:${chat.owner_id}:${chat.requester_id}`,
      chat.id,
    ]))
    return rows.map((row) => {
      const book = booksById.get(row.book_id)
      return {
        id: row.id,
        bookId: row.book_id,
        requesterId: row.requester_id,
        ownerId: row.owner_id,
        message: row.message ?? '',
        status: row.status as ExchangeRequest['status'],
        createdAt: row.created_at,
        ownerCompletedAt: row.owner_completed_at ?? undefined,
        requesterCompletedAt: row.requester_completed_at ?? undefined,
        completedAt: row.completed_at ?? undefined,
        chatId: chatsByParticipant.get(`${row.book_id}:${row.owner_id}:${row.requester_id}`),
        bookTitle: book?.title ?? 'Bài đăng không còn tồn tại',
        exchangeType: book?.exchange_type,
        bookStatus: book?.status,
        requesterName: namesById.get(row.requester_id) ?? 'Thành viên',
        ownerName: namesById.get(row.owner_id) ?? 'Thành viên',
      }
    })
  },

  async updateExchangeRequest(requestId, action) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase.rpc('update_book_exchange_request', {
      p_request_id: requestId,
      p_action: action,
    })
    if (error) throw new Error(error.message)
    if (typeof data !== 'string') throw new Error('Không thể cập nhật lời đề nghị.')
    return data
  },

  async getConversation(chatId, userId) {
    const supabase = getSupabaseClient()!
    const { data: chat, error } = await supabase
      .from('chats')
      .select('id, book_id, owner_id, requester_id')
      .eq('id', chatId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!chat || ![chat.owner_id, chat.requester_id].includes(userId)) return null
    const [bookResult, profilesResult] = await Promise.all([
      supabase.from('public_books')
        .select('id, title, category, exchange_type, status, image_urls')
        .eq('id', chat.book_id)
        .maybeSingle(),
      supabase.from('public_profiles')
        .select('id, full_name')
        .in('id', [chat.owner_id, chat.requester_id]),
    ])
    if (bookResult.error) throw new Error(bookResult.error.message)
    if (profilesResult.error) throw new Error(profilesResult.error.message)
    if (!bookResult.data) return null
    const names = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]))
    return {
      id: chat.id,
      book: {
        id: bookResult.data.id,
        title: bookResult.data.title,
        category: bookResult.data.category,
        exchangeType: bookResult.data.exchange_type,
        status: bookResult.data.status,
        imageUrls: bookResult.data.image_urls ?? [],
      },
      ownerId: chat.owner_id,
      ownerName: names.get(chat.owner_id) ?? 'Thành viên',
      requesterId: chat.requester_id,
      requesterName: names.get(chat.requester_id) ?? 'Thành viên',
    } satisfies BookConversation
  },

  async getChatMessages(chatId) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('messages')
      .select('id, chat_id, sender_id, body, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw new Error(error.message)
    return (data ?? []).reverse().map((row) => ({
      id: row.id,
      chatId: row.chat_id,
      senderId: row.sender_id,
      body: row.body,
      createdAt: row.created_at,
    }))
  },

  async sendChatMessage(chatId, senderId, body) {
    const normalizedBody = body.trim()
    if (!normalizedBody || normalizedBody.length > 2000) {
      throw new Error('Tin nhắn cần có từ 1 đến 2000 ký tự.')
    }
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, sender_id: senderId, body: normalizedBody })
      .select('id, chat_id, sender_id, body, created_at')
      .single()
    if (error) throw new Error(error.message)
    return {
      id: data.id,
      chatId: data.chat_id,
      senderId: data.sender_id,
      body: data.body,
      createdAt: data.created_at,
    }
  },

  subscribeToChatMessages(chatId, onMessage) {
    const supabase = getSupabaseClient()!
    const channel: RealtimeChannel = supabase
      .channel(`booki-chat-${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        const row = payload.new as Record<string, unknown>
        if (
          typeof row.id === 'string' &&
          typeof row.chat_id === 'string' &&
          typeof row.sender_id === 'string' &&
          typeof row.body === 'string' &&
          typeof row.created_at === 'string'
        ) {
          onMessage({
            id: row.id,
            chatId: row.chat_id,
            senderId: row.sender_id,
            body: row.body,
            createdAt: row.created_at,
          })
        }
      })
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Realtime chat updates are unavailable', error)
        }
      })
    return () => { void supabase.removeChannel(channel) }
  },

  async getExchangeReview(interactionId, reviewerId) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('book_reviews')
      .select('id, interaction_id, book_id, reviewer_id, rating, communication_rating, reliability_rating, description_rating, comment, created_at')
      .eq('interaction_id', interactionId)
      .eq('reviewer_id', reviewerId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null
    const { data: profile, error: profileError } = await supabase
      .from('public_profiles')
      .select('full_name')
      .eq('id', data.reviewer_id)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    return {
      id: data.id,
      interactionId: data.interaction_id,
      bookId: data.book_id,
      reviewerId: data.reviewer_id,
      reviewerName: profile?.full_name ?? 'Thành viên',
      rating: data.rating,
      communicationRating: data.communication_rating,
      reliabilityRating: data.reliability_rating,
      descriptionRating: data.description_rating,
      comment: optionalText(data.comment),
      createdAt: data.created_at,
    }
  },

  async getMemberReviews(memberId, limit = 5) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('book_reviews')
      .select('id, interaction_id, book_id, reviewer_id, rating, communication_rating, reliability_rating, description_rating, comment, created_at')
      .eq('reviewee_id', memberId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    const reviews = data ?? []
    const reviewerIds = [...new Set(reviews.map((review) => review.reviewer_id))]
    const { data: profiles, error: profilesError } = reviewerIds.length > 0
      ? await supabase.from('public_profiles').select('id, full_name').in('id', reviewerIds)
      : { data: [], error: null }
    if (profilesError) throw new Error(profilesError.message)
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
    return reviews.map((review) => ({
      id: review.id,
      interactionId: review.interaction_id,
      bookId: review.book_id,
      reviewerId: review.reviewer_id,
      reviewerName: names.get(review.reviewer_id) ?? 'Thành viên',
      rating: review.rating,
      communicationRating: review.communication_rating,
      reliabilityRating: review.reliability_rating,
      descriptionRating: review.description_rating,
      comment: optionalText(review.comment),
      createdAt: review.created_at,
    }))
  },

  async getMemberTrust(memberId) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('public_member_trust')
      .select('completed_interactions, review_count, average_rating')
      .eq('member_id', memberId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return {
      completedInteractions: data?.completed_interactions ?? 0,
      reviewCount: data?.review_count ?? 0,
      averageRating: data?.average_rating ?? undefined,
    }
  },

  async createExchangeReview(input) {
    const supabase = getSupabaseClient()!
    const { error } = await supabase.rpc('create_exchange_review', {
      p_interaction_id: input.interactionId,
      p_rating: input.rating,
      p_communication_rating: input.communicationRating,
      p_reliability_rating: input.reliabilityRating,
      p_description_rating: input.descriptionRating,
      p_comment: input.comment,
    })
    if (error) throw new Error(error.message)
  },
}

let adapter: DataAdapter | null = null

export function getAdapter(): DataAdapter {
  if (!adapter) {
    adapter = isSupabaseConfigured ? supabaseAdapter : localAdapter
  }
  return adapter
}

export function getAdapterMode(): 'supabase' | 'local' {
  return isSupabaseConfigured ? 'supabase' : 'local'
}
