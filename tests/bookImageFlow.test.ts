import assert from 'node:assert/strict'
import test from 'node:test'
import { dataUrlToBlob } from '../src/lib/imageCompression.ts'
import { classifyUserFacingErrorMessage, userFacingError } from '../src/lib/userFacingError.ts'
import { validateBookForm } from '../src/lib/validation.ts'

const validBook = {
  title: 'Sách tham khảo',
  category: 'Văn học',
  condition: 'good',
  exchangeType: 'share',
  contactPhone: '',
  contactEmail: '',
  contactZaloUrl: '',
  contactMessengerUrl: '',
}

test('short non-empty descriptions remain valid while blank descriptions are rejected', () => {
  for (const description of ['Sách còn mới.', 'Đọc rất ổn.', 'Test app']) {
    assert.equal(validateBookForm({ ...validBook, description }).description, undefined)
  }
  assert.equal(
    validateBookForm({ ...validBook, description: '  \n ' }).description,
    'Mô tả không được để trống.',
  )
})

test('compressed data URLs are decoded with their actual supported MIME type', () => {
  const blob = dataUrlToBlob('data:image/webp;base64,aGVsbG8=')
  assert.equal(blob.type, 'image/webp')
  assert.equal(blob.size, 5)
})

test('invalid or unsupported image data URLs are rejected instead of defaulting to JPEG', () => {
  assert.throws(() => dataUrlToBlob('data:image/avif;base64,aGVsbG8='), /Ảnh đã chọn không hợp lệ/)
  assert.throws(() => dataUrlToBlob('data:image/webp;base64,%%%'), /Ảnh đã chọn không hợp lệ/)
})

test('only genuine network failures receive the unstable-connection message', () => {
  assert.match(
    classifyUserFacingErrorMessage('TypeError: Failed to fetch') ?? '',
    /Kết nối đang không ổn định/,
  )
  assert.match(
    classifyUserFacingErrorMessage('Request timed out') ?? '',
    /Kết nối đang không ổn định/,
  )
  assert.equal(
    userFacingError(new Error('Bucket not found'), 'Chưa thể đăng sách.'),
    'Kho lưu trữ ảnh chưa được cấu hình. Kiểm tra bucket book-covers trong Supabase nha.',
  )
  assert.equal(
    classifyUserFacingErrorMessage('new row violates row-level security policy', {
      context: 'storage',
      bucket: 'book-covers',
    }),
    'Chưa có quyền tải ảnh lên kho lưu trữ. Kiểm tra Storage Policy trong Supabase nha.',
  )
  assert.equal(
    classifyUserFacingErrorMessage('Request entity too large', {
      context: 'storage',
      statusCode: '413',
    }),
    'Ảnh sau khi tối ưu vẫn vượt quá giới hạn 5 MB. Hãy chọn ảnh khác nha.',
  )
  assert.equal(
    classifyUserFacingErrorMessage('duplicate key violates unique constraint', {
      context: 'database',
    }),
    'Chưa thể lưu bài đăng. Dữ liệu hoặc cấu hình máy chủ đang có vấn đề.',
  )
  assert.equal(
    classifyUserFacingErrorMessage('Unexpected storage error', { context: 'storage' }),
    'Không thể tải ảnh lên kho lưu trữ. Kiểm tra cấu hình Storage rồi thử lại nha.',
  )
})
