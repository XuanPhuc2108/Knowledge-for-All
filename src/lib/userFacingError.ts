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
  /^(?:pgrst|postgrest|22p02|235\d{2})\b/i,
  /^(?:failed|unable|unexpected|invalid|cannot|could not)\b/i,
  /stack trace| at [\w$.]+\s*\(/i,
  /oauth|provider.{0,30}not enabled|redirect uri|rate limit/i,
]

const SAFE_VIETNAMESE_MESSAGES = [
  'Xác nhận email bằng mã OTP trước khi sử dụng tài khoản.',
  'Xác nhận email bằng mã OTP trước khi đăng nhập.',
  'Mã OTP chưa xác nhận được email.',
  'Email hoặc mật khẩu không đúng',
  'Email hoặc mật khẩu không đúng.',
  'Mật khẩu hiện tại không đúng',
  'Đăng nhập để lưu sách yêu thích',
  'Đang tải sách yêu thích, vui lòng thử lại.',
  'Bạn đã báo cáo sách này',
  'Đăng ký mới cần Supabase Auth',
  'Xác nhận email cần được cấu hình qua Supabase',
  'Không tìm thấy tài khoản',
  'Không tìm thấy người dùng',
  'Không tìm thấy sách',
  'Không có quyền chỉnh sửa',
  'Không có quyền xóa',
  'Bạn không thể gửi đề nghị cho sách của mình.',
  'Không thể cập nhật đề nghị này.',
  'Không thể hủy đề nghị này.',
  'Xác nhận hoàn tất cần kết nối Supabase.',
  'Tin nhắn giữa các thành viên cần kết nối Supabase.',
  'Đánh giá sau tương tác cần kết nối Supabase.',
  'Quản lý vai trò cần kết nối Supabase.',
  'Công cụ kiểm duyệt chỉ khả dụng khi đã kết nối Supabase.',
  'Chưa được cấu hình',
]

const KNOWN_DOMAIN_ERRORS: Record<string, string> = {
  'Book is not available': 'Sách này hiện không còn khả dụng.',
  'Cannot request your own book': 'Bạn không thể gửi đề nghị cho sách của mình.',
  'Not authorized to change this request': 'Bạn không có quyền cập nhật lời đề nghị này.',
  'Not authorized to cancel this request': 'Bạn không có quyền hủy lời đề nghị này.',
  'This interaction cannot be completed': 'Lượt kết nối này chưa thể xác nhận hoàn tất.',
  'A completed interaction is required to review': 'Chỉ có thể gửi phản hồi sau khi hai bên xác nhận hoàn tất.',
  'An active request already exists for this book': 'Bạn đã có một lời đề nghị đang chờ hoặc đang kết nối về sách này.',
  'This book already has an active accepted request': 'Sách này đang được kết nối với một thành viên khác.',
  'Another request is already accepted for this book': 'Sách này đang được kết nối với một thành viên khác.',
  'Book is no longer available': 'Sách này hiện không còn khả dụng.',
  'Request not found': 'Không tìm thấy lời đề nghị này.',
  'Invalid login credentials': 'Email hoặc mật khẩu không đúng.',
  'Email not confirmed': 'Hãy xác nhận email trước khi đăng nhập.',
  'Token has expired or is invalid': 'Mã OTP đã hết hạn hoặc không chính xác. Hãy gửi mã mới.',
  'Token is invalid or has expired': 'Mã OTP đã hết hạn hoặc không chính xác. Hãy gửi mã mới.',
  'Message must contain 10 to 1000 characters': 'Lời nhắn cần dài từ 10 đến 1000 ký tự.',
  'Auth session missing!': 'Phiên đăng nhập không còn hiệu lực. Đăng nhập lại để tiếp tục nha.',
}

type ErrorContext = 'storage' | 'database'

export function classifyUserFacingErrorMessage(
  message: string,
  options: { context?: ErrorContext; bucket?: string; statusCode?: string } = {},
): string | undefined {
  const normalized = message.trim()
  if (!normalized) return undefined
  const { context, bucket = 'book-covers', statusCode } = options

  if (/failed to fetch|fetch failed|networkerror|network request failed|request timed out|timed out|timeout|temporary connection failure|connection (?:reset|refused|closed)/i.test(normalized)) {
    return 'Kết nối đang không ổn định. Kiểm tra mạng rồi thử lại nha.'
  }
  if (
    statusCode === '401' ||
    /(?:jwt|token).{0,25}(?:expired|invalid)|auth(?:entication)? session (?:missing|expired)|not authenticated|unauthorized/i.test(normalized)
  ) {
    return 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Đăng nhập lại rồi thử nha.'
  }
  if (
    /bucket(?:\s+(?:not found|does not exist)|\s+.*(?:missing|not found))|storage bucket.*(?:missing|not found)|missing.*bucket/i.test(normalized)
  ) {
    return `Kho lưu trữ ảnh chưa được cấu hình. Kiểm tra bucket ${bucket} trong Supabase nha.`
  }
  if (context === 'storage' && (statusCode === '413' || /(?:maximum|exceed|too large).{0,40}(?:size|limit)|(?:size|limit).{0,40}(?:maximum|exceed|too large)/i.test(normalized))) {
    return 'Ảnh sau khi tối ưu vẫn vượt quá giới hạn 5 MB. Hãy chọn ảnh khác nha.'
  }
  if (
    /invalid.*(?:mime|content.?type|payload|image|file)|unsupported.*(?:mime|image|file)|(?:mime|content.?type).{0,40}(?:invalid|unsupported|not allowed|not supported)|format.*(?:image|file) not supported/i.test(normalized)
  ) {
    return 'Ảnh tải lên không hợp lệ. Hãy dùng tệp ảnh PNG, JPG hoặc WebP nha.'
  }
  if (
    context === 'storage' &&
    (statusCode === '403' || /permission denied|not allowed to upload|row-level security|rls policy|storage policy|policy.*storage/i.test(normalized))
  ) {
    return 'Chưa có quyền tải ảnh lên kho lưu trữ. Kiểm tra Storage Policy trong Supabase nha.'
  }
  if (context === 'storage') {
    return 'Không thể tải ảnh lên kho lưu trữ. Kiểm tra cấu hình Storage rồi thử lại nha.'
  }
  if (
    context === 'database' ||
    /schema cache|could not find (?:the )?(?:table|relationship|column)|relation .+ does not exist|column .+ does not exist|violates .+ constraint|duplicate key|invalid input syntax|^(?:pgrst|postgrest|22p02|235\d{2})\b/i.test(normalized)
  ) {
    return 'Chưa thể lưu bài đăng. Dữ liệu hoặc cấu hình máy chủ đang có vấn đề.'
  }
  return undefined
}

export function userFacingError(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message.trim()) return fallback
  const message = error.message.trim()
  if (KNOWN_DOMAIN_ERRORS[message]) return KNOWN_DOMAIN_ERRORS[message]
  if (SAFE_VIETNAMESE_MESSAGES.some((safe) => message.startsWith(safe))) return message
  const classified = classifyUserFacingErrorMessage(message)
  if (classified) return classified
  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallback
  }
  return message
}
