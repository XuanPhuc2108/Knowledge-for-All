export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, '')
  return /^(0|\+84)[3-9]\d{8}$/.test(cleaned) || /^\+[1-9]\d{8,14}$/.test(cleaned)
}

function isHttpsUrlOnAllowedHost(value: string, hosts: string[]): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && hosts.includes(url.hostname.toLowerCase()) && url.pathname.length > 1
  } catch {
    return false
  }
}

export function isValidZaloUrl(value: string): boolean {
  return isHttpsUrlOnAllowedHost(value, ['zalo.me', 'www.zalo.me'])
}

export function isValidMessengerUrl(value: string): boolean {
  return isHttpsUrlOnAllowedHost(value, ['m.me', 'www.messenger.com'])
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự'
  return null
}

export function validateRegister(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!fullName.trim() || fullName.trim().length < 2) {
    errors.fullName = 'Họ tên phải có ít nhất 2 ký tự'
  }
  if (!isValidEmail(email)) {
    errors.email = 'Email không hợp lệ'
  }
  const pwError = validatePassword(password)
  if (pwError) errors.password = pwError
  if (password !== confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
  }
  return errors
}

export function validateLogin(email: string, password: string): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!isValidEmail(email)) errors.email = 'Email không hợp lệ'
  if (!password) errors.password = 'Vui lòng nhập mật khẩu'
  return errors
}

export function validateBookForm(data: {
  title: string
  category: string
  condition: string
  exchangeType: string
  description: string
  contactPhone?: string
  contactEmail?: string
  contactZaloUrl?: string
  contactMessengerUrl?: string
}): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.title.trim() || data.title.trim().length < 2) {
    errors.title = 'Tên sách phải có ít nhất 2 ký tự'
  }
  if (!data.category) errors.category = 'Vui lòng chọn thể loại'
  if (!data.condition) errors.condition = 'Vui lòng chọn tình trạng'
  if (!data.exchangeType) errors.exchangeType = 'Vui lòng chọn hình thức'
  if (!data.description.trim()) {
    errors.description = 'Mô tả không được để trống.'
  }
  if (data.contactPhone?.trim() && !isValidPhone(data.contactPhone)) {
    errors.contactPhone = 'Số điện thoại không hợp lệ'
  }
  if (data.contactEmail?.trim() && !isValidEmail(data.contactEmail)) {
    errors.contactEmail = 'Email liên hệ không hợp lệ'
  }
  if (data.contactZaloUrl?.trim() && !isValidZaloUrl(data.contactZaloUrl)) {
    errors.contactZaloUrl = 'Hãy nhập liên kết Zalo bắt đầu bằng https://zalo.me/'
  }
  if (data.contactMessengerUrl?.trim() && !isValidMessengerUrl(data.contactMessengerUrl)) {
    errors.contactMessengerUrl = 'Hãy nhập liên kết Messenger bắt đầu bằng https://m.me/'
  }
  return errors
}
