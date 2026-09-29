export interface UserProfile {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
  latitude?: number
  longitude?: number
  locationAccuracy?: number
  locationEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RegisterInput {
  fullName: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface UpdateProfileInput {
  fullName?: string
  avatarUrl?: string
  latitude?: number
  longitude?: number
  locationAccuracy?: number
  locationEnabled?: boolean
}
