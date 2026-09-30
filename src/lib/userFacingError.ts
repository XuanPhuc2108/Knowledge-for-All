const TECHNICAL_ERROR_PATTERNS = [
  /schema cache/i,
  /could not find (?:the )?(?:table|relationship|column)/i,
  /relation .+ does not exist/i,
  /column .+ does not exist/i,
  /permission denied/i,
  /row-level security/i,
  /postgres|postgrest|supabase/i,
  /violates .+ constraint/i,
  /duplicate key/i,
  /invalid input syntax/i,
  /failed to fetch|networkerror/i,
  /jwt|bearer token/i,
]

const SAFE_VIETNAMESE_MESSAGES = [
  'Xác nhận email trước khi sử dụng tài khoản.',
  'Xác nhận email trước khi đăng nhập.',
  'Email hoặc mật khẩu không đúng',
  'Mật khẩu hiện tại không đúng',
  'Đăng nhập để lưu sách yêu thích',
  'Đang tải sách yêu thích, vui lòng thử lại.',
  'Bạn đã báo cáo sách này',
]

const KNOWN_DOMAIN_ERRORS: Record<string, string> = {
  'Book is not available': 'Sách này hiện không còn khả dụng.',
  'Cannot request your own book': 'Bạn không thể gửi đề nghị cho sách của mình.',
  'Not authorized to change this request': 'Bạn không có quyền cập nhật lời đề nghị này.',
  'Not authorized to cancel this request': 'Bạn không có quyền hủy lời đề nghị này.',
  'This interaction cannot be completed': 'Lượt kết nối này chưa thể xác nhận hoàn tất.',
  'A completed interaction is required to review': 'Chỉ có thể gửi phản hồi sau khi hai bên xác nhận hoàn tất.',
}

export function userFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message.trim()) return fallback
  const message = error.message.trim()
  if (KNOWN_DOMAIN_ERRORS[message]) return KNOWN_DOMAIN_ERRORS[message]
  if (SAFE_VIETNAMESE_MESSAGES.some((safe) => message.startsWith(safe))) return message
  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    if (/failed to fetch|networkerror/i.test(message)) {
      return 'Kết nối đang không ổn định. Kiểm tra mạng rồi thử lại nha.'
    }
    return fallback
  }
  return message
}
