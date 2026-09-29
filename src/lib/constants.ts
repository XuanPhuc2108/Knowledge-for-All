export const APP_NAME = 'Knowledge for All'
export const APP_TAGLINE = 'Tri thức không biên giới'

export const BOOK_CATEGORIES = [
  'Văn học',
  'Khoa học',
  'Lịch sử',
  'Kinh tế',
  'Giáo dục',
  'Thiếu nhi',
  'Ngoại ngữ',
  'Kỹ năng sống',
  'Khác',
] as const

export const CONDITION_LABELS: Record<string, string> = {
  new: 'Mới',
  good: 'Tốt',
  used: 'Đã dùng',
  old: 'Cũ',
}

export const EXCHANGE_LABELS: Record<string, string> = {
  share: 'Chia sẻ',
  exchange: 'Trao đổi',
  borrow: 'Cho mượn',
}

export const STATUS_LABELS: Record<string, string> = {
  available: 'Có sẵn',
  reserved: 'Đã đặt',
  shared: 'Đã chia sẻ',
}

export const RADIUS_OPTIONS = [
  { value: 1000, label: '1 km' },
  { value: 3000, label: '3 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
  { value: Infinity, label: 'Tất cả' },
] as const
