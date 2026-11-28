import type { StaffAppUser } from '../types/book'

export const SYNTHETIC_USERS_MARKER = 'BOOKI_LOCAL_SYNTHETIC_USERS_V1'
export const SYNTHETIC_USERS_STORAGE_KEY = 'booki_local_synthetic_users_v1'
export const LOCAL_QA_ADMIN_KEY = 'booki_local_qa_admin_v1'

interface SyntheticUserFile {
  marker: string
  users: unknown[]
}

export function parseSyntheticUserFile(input: unknown): StaffAppUser[] {
  if (
    typeof input !== 'object'
    || input === null
    || !('marker' in input)
    || input.marker !== SYNTHETIC_USERS_MARKER
    || !('users' in input)
    || !Array.isArray(input.users)
    || input.users.length > 5000
  ) {
    throw new Error('Tệp không đúng định dạng dataset QA của BOOKI.')
  }

  const file = input as SyntheticUserFile
  return file.users.map((value, index) => {
    if (typeof value !== 'object' || value === null) {
      throw new Error(`Hồ sơ kiểm thử ${index + 1} không hợp lệ.`)
    }
    const user = value as Record<string, unknown>
    if (
      user.synthetic !== true
      || user.source !== SYNTHETIC_USERS_MARKER
      || user.role !== 'user'
      || typeof user.userId !== 'string'
      || typeof user.fullName !== 'string'
      || !user.fullName.trim()
      || typeof user.email !== 'string'
      || !user.email.endsWith('@example.test')
      || typeof user.joinedAt !== 'string'
      || !Number.isFinite(Date.parse(user.joinedAt))
    ) {
      throw new Error(`Hồ sơ kiểm thử ${index + 1} không vượt qua kiểm tra an toàn.`)
    }
    return {
      userId: user.userId,
      fullName: user.fullName.trim(),
      email: user.email,
      role: 'user',
      joinedAt: user.joinedAt,
      synthetic: true,
      syntheticKind: 'local-qa',
      avatarUrl: typeof user.avatarUrl === 'string' ? user.avatarUrl : undefined,
      bio: typeof user.bio === 'string' ? user.bio : undefined,
    }
  })
}

export function readStoredSyntheticUsers(storage: Storage): StaffAppUser[] {
  const stored = storage.getItem(SYNTHETIC_USERS_STORAGE_KEY)
  if (!stored) return []
  return parseSyntheticUserFile(JSON.parse(stored))
}
