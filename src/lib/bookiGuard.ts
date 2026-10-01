export type BookGuardRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type BookGuardSource = 'RULES' | 'LOCAL_MODEL' | 'FUTURE_PROVIDER'

export interface BookGuardTextInput {
  title: string
  description: string
  author?: string
  category?: string
  reportReason?: string
  similarTitles?: string[]
}

export interface BookGuardAssessment {
  riskLevel: BookGuardRiskLevel
  reasons: string[]
  source: BookGuardSource
}

export interface BookGuardImageInput {
  imageUrl?: string
}

export interface BookGuardImageAssessment {
  status: 'manual_review_required'
  reason: string
  source: 'RULES'
}

export interface ModerationProvider {
  moderateText(input: BookGuardTextInput): Promise<BookGuardAssessment>
  moderateImage(input: BookGuardImageInput): Promise<BookGuardImageAssessment>
}

const PROMOTION_PATTERNS = [
  /mua ngay/i,
  /click ngay/i,
  /kiếm tiền nhanh/i,
  /vay tiền nhanh/i,
  /tuyển cộng tác viên/i,
  /kiếm tiền tại nhà/i,
]

const INAPPROPRIATE_PATTERNS = [
  /(?:^|[^\p{L}\p{N}])(?:địt|đụ|fuck|shit)(?:$|[^\p{L}\p{N}])/iu,
]

const MEANINGLESS_TEXT = /^(test|asdf|qwerty|xxx+|abc+|không có gì|khong co gi|.)$/i
const LINK_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi
const PHONE_PATTERN = /(?:\+?\d[\d ().-]{7,}\d)/g
const EMAIL_PATTERN = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi

function normalizeTitle(title: string): string {
  return title.toLocaleLowerCase('vi').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function assessText(input: BookGuardTextInput): BookGuardAssessment {
  const title = input.title.trim()
  const description = input.description.trim()
  const content = [title, input.author, input.category, description].filter(Boolean).join(' ')
  const reasons: string[] = []
  let weight = 0

  const links = content.match(LINK_PATTERN) ?? []
  if (links.length > 0) {
    reasons.push(links.length > 1
      ? 'Nội dung có nhiều đường dẫn bên ngoài.'
      : 'Nội dung có đường dẫn bên ngoài.')
    weight += links.length > 1 ? 2 : 1
  }

  if (/(.)\1{5,}/iu.test(content)) {
    reasons.push('Có chuỗi ký tự lặp bất thường.')
    weight += 2
  }

  const words = description.toLocaleLowerCase('vi').match(/[\p{L}\p{N}]+/gu) ?? []
  const uniqueWordRatio = words.length === 0 ? 1 : new Set(words).size / words.length
  if (words.length >= 20 && uniqueWordRatio < 0.35) {
    reasons.push('Mô tả lặp lại từ ngữ nhiều hơn bình thường.')
    weight += 1
  }

  const promotionMatches = PROMOTION_PATTERNS.filter((pattern) => pattern.test(content)).length
  if (promotionMatches > 0) {
    reasons.push(promotionMatches > 1
      ? 'Có nhiều cụm từ quảng bá hoặc kêu gọi bất thường.'
      : 'Có cụm từ quảng bá cần được kiểm tra.')
    weight += promotionMatches > 1 ? 2 : 1
  }

  if (INAPPROPRIATE_PATTERNS.some((pattern) => pattern.test(content))) {
    reasons.push('Có ngôn từ cần được xem xét trong ngữ cảnh.')
    weight += 1
  }

  if (title.length < 2 || MEANINGLESS_TEXT.test(description)) {
    reasons.push('Thông tin sách hoặc mô tả có thể chưa đủ ý nghĩa.')
    weight += 1
  } else if (description.length < 12) {
    reasons.push('Mô tả khá ngắn, nên xem lại thông tin trước khi duyệt.')
    weight += 1
  }

  const normalizedTitle = normalizeTitle(title)
  if (
    normalizedTitle.length > 0 &&
    (input.similarTitles ?? []).some((candidate) => normalizeTitle(candidate) === normalizedTitle)
  ) {
    reasons.push('Có bài đăng khác cùng tiêu đề cần được đối chiếu.')
    weight += 2
  }

  const phoneMatches = content.match(PHONE_PATTERN) ?? []
  const emailMatches = content.match(EMAIL_PATTERN) ?? []
  if (phoneMatches.length > 1 || emailMatches.length > 1) {
    reasons.push('Phần mô tả có nhiều chuỗi liên hệ; cần xem thủ công.')
    weight += 1
  }

  const reportSignal = input.reportReason
    ? {
        incorrect: 'Cộng đồng báo thông tin chưa chính xác; cần đối chiếu.',
        unavailable: 'Cộng đồng báo sách có thể không còn khả dụng; cần xác minh.',
        inappropriate: 'Cộng đồng đã báo cáo nội dung không phù hợp; cần người kiểm duyệt xem xét.',
        other: 'Có báo cáo khác từ cộng đồng; cần xem thêm ngữ cảnh.',
      }[input.reportReason]
    : undefined
  if (reportSignal) reasons.push(reportSignal)

  return {
    riskLevel: weight >= 3 ? 'HIGH' : weight > 0 || reportSignal ? 'MEDIUM' : 'LOW',
    reasons: reasons.length > 0 ? reasons : ['Chưa phát hiện dấu hiệu đáng ngờ theo các quy tắc hiện có.'],
    source: 'RULES',
  }
}

export class LocalModerationProvider implements ModerationProvider {
  async moderateText(input: BookGuardTextInput): Promise<BookGuardAssessment> {
    return assessText(input)
  }

  async moderateImage(): Promise<BookGuardImageAssessment> {
    return {
      status: 'manual_review_required',
      reason: 'Ảnh chưa được phân loại tự động; cần người kiểm duyệt xem trực tiếp.',
      source: 'RULES',
    }
  }
}

export const localModerationProvider: ModerationProvider = new LocalModerationProvider()
