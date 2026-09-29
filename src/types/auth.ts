import type { UserProfile } from './user'

export interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
}

export interface AuthContextValue extends AuthState {
  register: (fullName: string, email: string, password: string) => Promise<UserProfile | null>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  refreshUser: () => Promise<void>
}
