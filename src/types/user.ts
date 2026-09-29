export interface UserProfile {
  id: string
  fullName: string
  email: string
  avatarUrl?: string
  bio?: string
  contactPhone?: string
  contactEmail?: string
  areaLabel?: string
  showContactPhone: boolean
  showContactEmail: boolean
  showArea: boolean
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
  bio?: string
  contactPhone?: string
  contactEmail?: string
  areaLabel?: string
  showContactPhone?: boolean
  showContactEmail?: boolean
  showArea?: boolean
  latitude?: number
  longitude?: number
  locationAccuracy?: number
  locationEnabled?: boolean
}
