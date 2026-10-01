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
  'Token has expired or is invalid': 'Mã OTP hết hạn hoặc chưa đúng. Gửi mã mới rồi thử lại nghen.',
  'Token is invalid or has expired': 'Mã OTP hết hạn hoặc chưa đúng. Gửi mã mới rồi thử lại nghen.',
  'Message must contain 10 to 1000 characters': 'Lời nhắn cần dài từ 10 đến 1000 ký tự.',
  'Auth session missing!': 'Phiên đăng nhập không còn hiệu lực. Đăng nhập lại để tiếp tục nha.',
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
