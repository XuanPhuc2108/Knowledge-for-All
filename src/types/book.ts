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
  contactZaloUrl?: string
  contactMessengerUrl?: string
  status: BookStatus
  moderationStatus?: BookGuardStatus
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
  contactZaloUrl?: string
  contactMessengerUrl?: string
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
  contactZaloUrl?: string
  contactMessengerUrl?: string
  status?: BookStatus
}

export interface ExchangeRequest {
  id: string
  bookId: string
  requesterId: string
  ownerId: string
  message: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed'
  createdAt: string
  ownerCompletedAt?: string
  requesterCompletedAt?: string
  completedAt?: string
  chatId?: string
  bookTitle?: string
  exchangeType?: ExchangeType
  bookStatus?: BookStatus
  requesterName?: string
  ownerName?: string
}

export interface CreateExchangeInput {
  bookId: string
  message: string
}

export type BookReportReason = 'incorrect' | 'unavailable' | 'inappropriate' | 'other'
export type BookReportStatus = 'pending' | 'reviewed' | 'resolved'
export type BookGuardRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type BookGuardStatus = 'needs_review' | 'cleared'
export type BookGuardDecision = 'kept' | 'marked_safe' | null
export type BookGuardSource = 'RULES' | 'LOCAL_MODEL' | 'FUTURE_PROVIDER'

export interface BookModerationReport {
  id: string
  bookId: string
  reporterId: string
  reporterName?: string
  reason: BookReportReason
  details?: string
  status: BookReportStatus
  createdAt: string
  book?: Pick<Book, 'id' | 'title' | 'ownerId' | 'ownerName' | 'status'>
}

export interface BookGuardQueueItem {
  bookId: string
  ownerId: string
  ownerName: string
  title: string
  author?: string
  category: string
  description: string
  bookStatus: BookStatus
  createdAt: string
  moderationStatus: BookGuardStatus
  riskLevel: BookGuardRiskLevel
  riskReasons: string[]
  moderationSource: BookGuardSource
  decision: BookGuardDecision
  reviewedAt?: string
  reviewedBy?: string
  imageReviewStatus: 'manual_review' | 'not_applicable'
  report?: {
    id: string
    reporterId: string
    reporterName?: string
    reason: BookReportReason
    details?: string
    status: BookReportStatus
    createdAt: string
  }
}

export interface CreateBookReportInput {
  bookId: string
  reason: BookReportReason
  details?: string
}

export interface BookWithDistance extends Book {
  distanceMeters?: number
}

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  body: string
  createdAt: string
}

export interface BookConversation {
  id: string
  book: Pick<Book, 'id' | 'title' | 'category' | 'exchangeType' | 'status' | 'imageUrls'>
  ownerId: string
  ownerName: string
  requesterId: string
  requesterName: string
}

export interface CommunityReview {
  id: string
  reviewerName: string
  rating: number
  communicationRating: number
  reliabilityRating: number
  descriptionRating: number
  comment?: string
  createdAt: string
}

export interface MemberTrust {
  completedInteractions: number
  reviewCount: number
  averageRating?: number
}

export interface StaffAppUser {
  userId: string
  fullName: string
  avatarUrl?: string
  role: 'user' | 'moderator' | 'admin' | 'owner'
  joinedAt: string
}

export interface StaffPlatformSummary {
  userCount: number
  bookCount: number
  pendingReportCount: number
  activeRequestCount: number
  completedInteractionCount: number
}

export interface AppAuditEntry {
  id: number
  actorId?: string
  subjectUserId?: string
  bookId?: string
  eventType: string
  details: Record<string, unknown>
  createdAt: string
}
