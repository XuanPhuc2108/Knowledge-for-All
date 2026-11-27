import type { UserProfile } from './user'

export interface AuthState {
  user: UserProfile | null
  loading: boolean
  error: string | null
}

export interface AuthContextValue extends AuthState {
  passwordRecovery: boolean
  sendEmailOtp: (email: string) => Promise<void>
  resendEmailOtp: (email: string) => Promise<void>
  verifyEmailOtp: (email: string, token: string) => Promise<UserProfile | null>
  completeProfile: (fullName: string) => Promise<UserProfile>
  sendPasswordReset: (email: string) => Promise<void>
  completePasswordReset: (newPassword: string) => Promise<void>
  login: (email: string, password: string) => Promise<UserProfile | null>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  refreshUser: () => Promise<void>
}
