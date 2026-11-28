import type { StaffAppUser } from '../types/book.ts'
import { SYNTHETIC_USERS_MARKER } from './syntheticQaUsers.ts'

export const MODERATION_DEMO_COUNT = 439
export const MODERATION_DEMO_SOURCE = 'BOOKI_MODERATION_DEMO_V1'

export interface GeneratedSyntheticUser extends StaffAppUser {
  source: string
}

interface GenerateSyntheticUsersOptions {
  count?: number
  seed?: number
  now?: Date
  source?: string
  emailPrefix?: string
}

const HCM_OFFSET_MS = 7 * 60 * 60 * 1000
const VIETNAMESE_FIRST = [
  'Minh Anh', 'Gia Hân', 'Tuấn', 'Bảo Ngọc', 'Quỳnh', 'Hoàng Nam',
  'An', 'Hải Đăng', 'Ngọc Hân', 'Khánh Vy', 'Phương Thảo', 'Đức Anh',
  'Thảo', 'Mai', 'Tú Anh', 'Thanh Bình', 'Yến Nhi', 'Trọng Nhân',
  'Linh', 'Nhật Minh', 'Thu Hà', 'Bảo Châu', 'Khôi', 'Diệu Linh',
  'Kim Ngân', 'Minh Khang', 'Ánh Dương', 'Tường Vi',
]
const LATIN_FIRST = [
  'Alex', 'Daniel', 'Emma', 'Sophia', 'Ryan', 'Olivia', 'Ethan',
  'Lily', 'James', 'Mia', 'Noah', 'Ava', 'Lucas', 'Zoe',
  'Chloe', 'Leo', 'Grace', 'Mason', 'Nora', 'Kai',
]
const VIETNAMESE_LAST = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ',
  'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý',
]
const LATIN_LAST = [
  'Morgan', 'Wilson', 'Chen', 'Parker', 'Taylor', 'Reed', 'Brooks',
  'Nguyen', 'Tran', 'Garcia', 'Kim', 'Rivera', 'Bennett', 'Wong',
]
const HCM_TIME_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function hash32(input: string): number {
  let value = 2166136261
  for (const char of String(input)) {
    value ^= char.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function createRandom(seed: number): () => number {
  let state = hash32(String(seed)) || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}

function hcmDateParts(date: Date): Record<string, number> {
  return Object.fromEntries(
    HCM_TIME_FORMATTER.formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, Number(value)]),
  )
}

function makeHcmTimestamp(dayOffset: number, hour: number, minute: number, second: number, now: Date): string {
  const { year, month, day } = hcmDateParts(now)
  const hcmCalendarDate = new Date(Date.UTC(year, month - 1, day - dayOffset))
  const localAsUtc = Date.UTC(
    hcmCalendarDate.getUTCFullYear(),
    hcmCalendarDate.getUTCMonth(),
    hcmCalendarDate.getUTCDate(),
    hour,
    minute,
    second,
  )
  return new Date(localAsUtc - HCM_OFFSET_MS).toISOString()
}

function pickName(index: number, random: () => number): string {
  const format = index % 5
  const viFirst = VIETNAMESE_FIRST[index % VIETNAMESE_FIRST.length]
  const enFirst = LATIN_FIRST[(index * 7) % LATIN_FIRST.length]
  const viLast = VIETNAMESE_LAST[(index * 11) % VIETNAMESE_LAST.length]
  const enLast = LATIN_LAST[(index * 13) % LATIN_LAST.length]
  const noDiacritics = (value: string) => value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')

  if (format === 0) return viFirst
  if (format === 1) return `${viFirst} ${viLast}`
  if (format === 2) return `${enFirst} ${enLast}`
  if (format === 3) return `${enFirst} ${viLast}`
  return random() < 0.5 ? noDiacritics(`${viFirst} ${viLast}`) : `${viFirst} ${enLast}`
}

function pickUniqueFallbackName(index: number, seenNames: Set<string>): string {
  const firstNames = [...VIETNAMESE_FIRST, ...LATIN_FIRST]
  const middleNames = ['Minh', 'Anh', 'Gia', 'An', 'Mai', 'Linh', 'Bình', 'Thanh', 'Hải', 'Khánh', 'Thảo', 'Ngọc']
  const lastNames = [...VIETNAMESE_LAST, ...LATIN_LAST]
  const combinations = firstNames.length * middleNames.length * lastNames.length
  const start = (index * 37) % combinations

  for (let offset = 0; offset < combinations; offset += 1) {
    const candidateIndex = (start + offset) % combinations
    const lastName = lastNames[candidateIndex % lastNames.length]
    const middleIndex = Math.floor(candidateIndex / lastNames.length) % middleNames.length
    const firstIndex = Math.floor(candidateIndex / (lastNames.length * middleNames.length))
    const candidate = `${firstNames[firstIndex]} ${middleNames[middleIndex]} ${lastName}`
    if (!seenNames.has(candidate)) return candidate
  }

  throw new Error('Không thể tạo đủ tên QA duy nhất từ danh sách tên hiện có.')
}

function makeSyntheticId(seed: number, index: number): string {
  const first = hash32(`${seed}:${index}:a`).toString(16).padStart(8, '0')
  const second = hash32(`${seed}:${index}:b`).toString(16).padStart(8, '0')
  const third = hash32(`${seed}:${index}:c`).toString(16).padStart(8, '0')
  const fourth = hash32(`${seed}:${index}:d`).toString(16).padStart(8, '0')
  return `${first}-${second.slice(0, 4)}-4${third.slice(1, 4)}-8${fourth.slice(1, 4)}-${second}${third.slice(0, 4)}`
}

function pickRegistrationTime(random: () => number, now: Date, seenTimestamps: Set<string>): string {
  const today = random() < 0.68
  let dayOffset = today ? 0 : 1
  const cluster = random()
  let hour: number
  if (cluster < 0.46) hour = 18 + Math.floor(random() * 5)
  else if (cluster < 0.78) hour = 8 + Math.floor(random() * 5)
  else hour = 13 + Math.floor(random() * 9)

  const currentHcmHour = Number(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now))
  let minute = Math.floor(random() * 60)
  let second = Math.floor(random() * 60)
  if (dayOffset === 0 && hour >= currentHcmHour) {
    if (currentHcmHour === 0) {
      minute = 0
      second = 0
    } else {
      hour = Math.floor(random() * currentHcmHour)
    }
  }

  let timestamp = Date.parse(makeHcmTimestamp(dayOffset, hour, minute, second, now))
  const dayStart = Date.parse(makeHcmTimestamp(dayOffset, 0, 0, 0, now))
  const dayEnd = dayStart + 24 * 60 * 60 * 1000
  const latestAllowed = Math.min(dayEnd - 1000, Math.floor((now.getTime() - 1) / 1000) * 1000)
  if (timestamp > latestAllowed) timestamp = latestAllowed
  if (timestamp < dayStart && dayOffset === 0) {
    dayOffset = 1
    timestamp = Date.parse(makeHcmTimestamp(dayOffset, hour, minute, second, now))
  }

  const currentDayStart = Date.parse(makeHcmTimestamp(dayOffset, 0, 0, 0, now))
  const currentDayEnd = currentDayStart + 24 * 60 * 60 * 1000
  const dayLatestAllowed = Math.min(currentDayEnd - 1000, Math.floor((now.getTime() - 1) / 1000) * 1000)
  while (seenTimestamps.has(new Date(timestamp).toISOString()) || timestamp > dayLatestAllowed) {
    timestamp -= 1000
    if (timestamp < currentDayStart) timestamp = dayLatestAllowed
  }
  const isoTimestamp = new Date(timestamp).toISOString()
  seenTimestamps.add(isoTimestamp)
  return isoTimestamp
}

export function generateSyntheticUsers({
  count = 450,
  seed = 20261128,
  now = new Date(),
  source = SYNTHETIC_USERS_MARKER,
  emailPrefix = 'qa',
}: GenerateSyntheticUsersOptions = {}): GeneratedSyntheticUser[] {
  if (!Number.isInteger(count) || count < 1 || count > 5000) {
    throw new Error('Số lượng phải là số nguyên từ 1 đến 5000.')
  }
  if (!Number.isInteger(seed)) throw new Error('Seed phải là số nguyên.')
  const random = createRandom(seed)
  const users: GeneratedSyntheticUser[] = []
  const seenNames = new Set<string>()
  const seenTimestamps = new Set<string>()
  for (let index = 0; index < count; index += 1) {
    let fullName = pickName(index, random)
    if (seenNames.has(fullName)) fullName = pickUniqueFallbackName(index, seenNames)
    seenNames.add(fullName)
    const id = makeSyntheticId(seed, index)
    const emailTag = hash32(`${seed}:${index}:mail`).toString(36)
    const user: GeneratedSyntheticUser = {
      userId: id,
      fullName,
      email: `${emailPrefix}-${emailTag}@example.test`,
      role: 'user',
      joinedAt: pickRegistrationTime(random, now, seenTimestamps),
      synthetic: true,
      syntheticKind: source === SYNTHETIC_USERS_MARKER ? 'local-qa' : 'demo',
      source,
    }
    if (index % 7 !== 0) user.bio = index % 3 === 0 ? 'Đang tìm thêm sách hay để đọc.' : undefined
    if (index % 5 !== 0) user.avatarUrl = undefined
    users.push(user)
  }
  return users
}

export function generateModerationDemoUsers(now = new Date()): StaffAppUser[] {
  return generateSyntheticUsers({
    count: MODERATION_DEMO_COUNT,
    seed: 20261128,
    now,
    source: MODERATION_DEMO_SOURCE,
    emailPrefix: 'demo',
  })
}
