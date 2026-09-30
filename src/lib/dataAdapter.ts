import type {
  Book,
  BookModerationReport,
  BookReportReason,
  BookReportStatus,
  CreateBookInput,
  CreateExchangeInput,
  ExchangeRequest,
  UpdateBookInput,
} from '../types/book'
import type { LoginInput, RegisterInput, UpdateProfileInput, UserProfile } from '../types/user'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from './supabase'
import { localAdapter } from './localAdapter'

export interface DataAdapter {
  getCurrentUser(): Promise<UserProfile | null>
  register(input: RegisterInput): Promise<UserProfile | null>
  resendSignupConfirmation(email: string): Promise<void>
  login(input: LoginInput): Promise<UserProfile>
  logout(): Promise<void>
  updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile>
  deleteAccount(userId: string): Promise<void>
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>
  getBooks(limit?: number): Promise<Book[]>
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
  createExchangeRequest(requesterId: string, ownerId: string, input: CreateExchangeInput): Promise<ExchangeRequest>
  getExchangeRequests(userId: string): Promise<ExchangeRequest[]>
  getMyAppRole(userId: string): Promise<AppRole>
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
    ownerName: (publicProfile?.full_name as string) ?? (row.owner_name as string) ?? 'Người dùng',
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
        emailRedirectTo: window.location.origin,
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
      options: { emailRedirectTo: window.location.origin },
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

  async getBooks(limit) {
    const supabase = getSupabaseClient()!
    let query = supabase
      .from('books')
      .select('id, owner_id, title, author, category, condition, exchange_type, description, latitude, longitude, status, created_at, updated_at')
      .order('created_at', { ascending: false })
    if (limit) query = query.limit(limit)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return mapBooksWithPublicProfiles(supabase, data ?? [])
  },

  async getBookById(id) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('books')
      .select('*')
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
      .from('books')
      .select('id, owner_id, title, author, category, condition, exchange_type, description, latitude, longitude, status, created_at, updated_at')
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
      status: 'available',
      created_at: timestamp,
      updated_at: timestamp,
    }
    const { data, error } = await supabase.from('books').insert(payload).select().single()
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
    if (input.status !== undefined) payload.status = input.status

    const { data, error } = await supabase
      .from('books')
      .update(payload)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select()
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
      .select('id, owner_id, title, author, category, condition, exchange_type, description, latitude, longitude, status, created_at, updated_at')
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
      .from('books')
      .select('id, owner_id, title, status')
      .in('id', bookIds)
    if (booksError) throw new Error(booksError.message)
    const ownerIds = [...new Set((rows ?? []).map((row) => row.owner_id))]
    const { data: profiles, error: profilesError } = ownerIds.length > 0
      ? await supabase.from('public_profiles').select('id, full_name').in('id', ownerIds)
      : { data: [], error: null }
    if (profilesError) throw new Error(profilesError.message)
    const ownerNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))
    const booksById = new Map((rows ?? []).map((row) => [row.id, row]))
    return reports.map((report) => {
      const book = booksById.get(report.book_id)
      return {
        id: report.id,
        bookId: report.book_id,
        reporterId: report.reporter_id,
        reason: report.reason as BookReportReason,
        details: optionalText(report.details),
        status: (report.status ?? 'pending') as BookReportStatus,
        createdAt: report.created_at,
        book: book ? {
          id: book.id,
          title: book.title,
          ownerId: book.owner_id,
          ownerName: ownerNames.get(book.owner_id) ?? 'Người dùng',
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

  async createExchangeRequest(requesterId, ownerId, input) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('exchange_requests')
      .insert({
        book_id: input.bookId,
        requester_id: requesterId,
        owner_id: ownerId,
        message: input.message,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return {
      id: data.id,
      bookId: data.book_id,
      requesterId: data.requester_id,
      ownerId: data.owner_id,
      message: data.message,
      status: data.status,
      createdAt: data.created_at,
    }
  },

  async getExchangeRequests(userId) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase
      .from('exchange_requests')
      .select('*')
      .or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({
      id: row.id,
      bookId: row.book_id,
      requesterId: row.requester_id,
      ownerId: row.owner_id,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    }))
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
