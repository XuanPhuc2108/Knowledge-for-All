import type { UserProfile } from './user'

export interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
}

export interface AuthContextValue extends AuthState {
  passwordRecovery: boolean
  register: (fullName: string, email: string, password: string) => Promise<UserProfile | null>
  verifySignupOtp: (email: string, token: string) => Promise<UserProfile>
  resendSignupConfirmation: (email: string) => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  completePasswordReset: (newPassword: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  refreshUser: () => Promise<void>
}
