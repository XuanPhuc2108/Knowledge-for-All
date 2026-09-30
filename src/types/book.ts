export type BookCondition = 'new' | 'good' | 'used' | 'old'
export type ExchangeType = 'share' | 'exchange' | 'borrow'
export type BookStatus = 'available' | 'loaned' | 'exchanged'

export interface Book {
  id: string
  ownerId: string
  ownerName: string
  ownerAvatarUrl?: string
  ownerAreaLabel?: string
  title: string
  author?: string
  category: string
  condition: BookCondition
  exchangeType: ExchangeType
  description: string
  imageUrls: string[]
  latitude?: number
  longitude?: number
  contactPhone?: string
  contactEmail?: string
  status: BookStatus
  createdAt: string
  updatedAt: string
}

export interface CreateBookInput {
  title: string
  author?: string
  category: string
  condition: BookCondition
  exchangeType: ExchangeType
  description: string
  imageUrls: string[]
  latitude?: number
  longitude?: number
  contactPhone?: string
  contactEmail?: string
}

export interface UpdateBookInput {
  title?: string
  author?: string
  category?: string
  condition?: BookCondition
  exchangeType?: ExchangeType
  description?: string
  imageUrls?: string[]
  latitude?: number
  longitude?: number
  contactPhone?: string
  contactEmail?: string
  status?: BookStatus
}

export interface ExchangeRequest {
  id: string
  bookId: string
  requesterId: string
  ownerId: string
  message: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  createdAt: string
}

export interface CreateExchangeInput {
  bookId: string
  message: string
}

export type BookReportReason = 'incorrect' | 'unavailable' | 'inappropriate' | 'other'
export type BookReportStatus = 'pending' | 'reviewed' | 'resolved'

export interface BookModerationReport {
  id: string
  bookId: string
  reporterId: string
  reason: BookReportReason
  details?: string
  status: BookReportStatus
  createdAt: string
  book?: Pick<Book, 'id' | 'title' | 'ownerId' | 'ownerName' | 'status'>
}

export interface CreateBookReportInput {
  bookId: string
  reason: BookReportReason
  details?: string
}

export interface BookWithDistance extends Book {
  distanceMeters?: number
}
