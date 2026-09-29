import type { Book, CreateBookInput, CreateExchangeInput, ExchangeRequest, UpdateBookInput } from '../types/book'
import type { LoginInput, RegisterInput, UpdateProfileInput, UserProfile } from '../types/user'
import { getSupabaseClient, isSupabaseConfigured } from './supabase'
import { localAdapter } from './localAdapter'

export interface DataAdapter {
  getCurrentUser(): Promise<UserProfile | null>
  register(input: RegisterInput): Promise<UserProfile | null>
  login(input: LoginInput): Promise<UserProfile>
  logout(): Promise<void>
  updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile>
  getBooks(limit?: number): Promise<Book[]>
  getBookById(id: string): Promise<Book | null>
  createBook(ownerId: string, ownerName: string, input: CreateBookInput): Promise<Book>
  updateBook(id: string, ownerId: string, input: UpdateBookInput): Promise<Book>
  deleteBook(id: string, ownerId: string): Promise<void>
  getMyBooks(ownerId: string): Promise<Book[]>
  createExchangeRequest(requesterId: string, ownerId: string, input: CreateExchangeInput): Promise<ExchangeRequest>
  getExchangeRequests(userId: string): Promise<ExchangeRequest[]>
}

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    avatarUrl: row.avatar_url as string | undefined,
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
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    ownerName: (row.owner_name as string) ?? 'Người dùng',
    title: row.title as string,
    author: row.author as string | undefined,
    category: row.category as string,
    condition: row.condition as Book['condition'],
    exchangeType: row.exchange_type as Book['exchangeType'],
    description: row.description as string,
    imageUrls: (row.image_urls as string[]) ?? [],
    latitude: row.latitude as number | undefined,
    longitude: row.longitude as number | undefined,
    contactPhone: optionalText(row.contact_phone),
    contactEmail: optionalText(row.contact_email),
    status: row.status as Book['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

const supabaseAdapter: DataAdapter = {
  async getCurrentUser() {
    const supabase = getSupabaseClient()
    if (!supabase) return null
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) throw new Error(authError.message)
    if (!user) return null
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
      options: { data: { full_name: input.fullName } },
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Đăng ký thất bại')
    if (!data.session) return null

    const timestamp = new Date().toISOString()
    const profile = {
      id: data.user.id,
      full_name: input.fullName.trim(),
      email: (data.user.email ?? input.email).trim().toLowerCase(),
      location_enabled: false,
      created_at: timestamp,
      updated_at: timestamp,
    }
    const { error: profileError } = await supabase.from('profiles').upsert(profile)
    if (profileError) throw new Error(profileError.message)
    return mapProfile(profile)
  },

  async login(input) {
    const supabase = getSupabaseClient()!
    const { error } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    })
    if (error) throw new Error(error.message)
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

  async getBooks(limit) {
    const supabase = getSupabaseClient()!
    let query = supabase
      .from('books')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
    if (limit) query = query.limit(limit)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({
      ...mapBook(row),
      ownerName: (row.profiles as { full_name?: string } | null)?.full_name ?? 'Người dùng',
    }))
  },

  async getBookById(id) {
    const supabase = getSupabaseClient()!
    const { data, error } = await supabase.from('books').select('*').eq('id', id).single()
    if (error || !data) return null
    return mapBook(data)
  },

  async createBook(ownerId, ownerName, input) {
    const supabase = getSupabaseClient()!
    const timestamp = new Date().toISOString()
    const payload = {
      owner_id: ownerId,
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
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapBook)
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
